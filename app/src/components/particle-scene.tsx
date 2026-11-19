"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";

// The glowing 3D background, drawn with WebGL (Three.js).
// - "hero": scales of justice made of particles, above a particle ocean. Scrolling moves the camera.
// - "ambient": just the particle ocean, dimmer, for the working pages.
// If WebGL isn't available, nothing is drawn and the page's gradient background shows instead.
export default function ParticleScene({ variant }: { variant: "hero" | "ambient" }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cleanup = () => {};
    let cancelled = false;

    // Three.js is large, so it's loaded only in the browser, after the page is shown.
    import("three").then((THREE) => {
      if (cancelled) return;
      cleanup = startScene(THREE, mount, variant);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [variant]);

  return <div ref={mountRef} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}

// ---------- Shaders: soft glowing dots ----------

const POINT_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAssemble;   // 0 = scattered, 1 = in place
  uniform float uPixelRatio;
  uniform float uSize;
  attribute vec3 aStart;
  attribute float aSeed;
  varying float vSeed;
  varying float vDepth;
  void main() {
    float t = smoothstep(0.0, 1.0, clamp(uAssemble * 1.25 - aSeed * 0.25, 0.0, 1.0));
    vec3 p = mix(aStart, position, t);
    p += 0.012 * vec3(sin(uTime * 1.3 + aSeed * 40.0), cos(uTime * 1.1 + aSeed * 30.0), 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed * 0.9) * uPixelRatio * (6.0 / -mv.z);
    vSeed = aSeed;
    vDepth = -mv.z;
  }
`;

const OCEAN_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute float aSeed;
  varying float vSeed;
  varying float vDepth;
  varying float vCrest;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.32 + uTime * 0.55) * 0.28
            + sin(p.z * 0.45 + uTime * 0.38) * 0.22
            + sin((p.x + p.z) * 0.18 + uTime * 0.27) * 0.35;
    p.y += w;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio * (6.0 / -mv.z);
    vSeed = aSeed;
    vDepth = -mv.z;
    vCrest = smoothstep(-0.3, 0.7, w);
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vSeed;
  varying float vDepth;
  #ifdef OCEAN
  varying float vCrest;
  #endif
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, d);
    float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + vSeed * 2.0) + vSeed * 60.0);
    float mixAmount = vSeed;
    #ifdef OCEAN
    mixAmount = vCrest * 0.8 + vSeed * 0.2;
    alpha *= smoothstep(36.0, 4.0, vDepth) * 1.4;
    #endif
    vec3 color = mix(uColorA, uColorB, mixAmount);
    gl_FragColor = vec4(color, alpha * twinkle * uOpacity);
  }
`;

// ---------- Building the scales of justice out of points ----------

type Pts = number[];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// A solid disc (top face + edge), centred on the y-axis.
function disc(out: Pts, n: number, radius: number, y: number, height: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    if (Math.random() < 0.55) {
      const r = radius * Math.sqrt(Math.random());
      out.push(Math.cos(a) * r, y + height, Math.sin(a) * r);
    } else {
      out.push(Math.cos(a) * radius, y + Math.random() * height, Math.sin(a) * radius);
    }
  }
}

// A vertical rod along the y-axis.
function rod(out: Pts, n: number, radius: number, y0: number, y1: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    out.push(Math.cos(a) * radius, rand(y0, y1), Math.sin(a) * radius);
  }
}

// A horizontal bar along the x-axis, thicker in the middle.
function bar(out: Pts, n: number, halfLength: number, y: number) {
  for (let i = 0; i < n; i++) {
    const x = rand(-halfLength, halfLength);
    const r = 0.07 * (1 - 0.5 * Math.abs(x / halfLength));
    const a = Math.random() * Math.PI * 2;
    out.push(x, y + Math.cos(a) * r, Math.sin(a) * r);
  }
}

function ball(out: Pts, n: number, radius: number, cx: number, cy: number) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    out.push(cx + radius * s * Math.cos(a), cy + radius * u, radius * s * Math.sin(a));
  }
}

// One hanging side: three chains meeting at the top, holding a shallow bowl.
// Coordinates are relative to the hanging point at the end of the beam.
function hangingPan(out: Pts, chainPoints: number, panPoints: number) {
  const drop = 1.55;
  const radius = 0.72;
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2 + Math.PI / 6;
    const ex = Math.cos(a) * radius;
    const ez = Math.sin(a) * radius;
    for (let i = 0; i < chainPoints / 3; i++) {
      const t = Math.random();
      out.push(ex * t, -drop * t, ez * t);
    }
  }
  for (let i = 0; i < panPoints; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    const depth = 0.28 * (1 - (r / radius) ** 2);
    out.push(Math.cos(a) * r, -drop - depth, Math.sin(a) * r);
  }
  // A brighter rim
  for (let i = 0; i < panPoints * 0.25; i++) {
    const a = Math.random() * Math.PI * 2;
    out.push(Math.cos(a) * radius, -drop + rand(-0.02, 0.02), Math.sin(a) * radius);
  }
}

// ---------- The scene ----------

function startScene(THREE: typeof Three, mount: HTMLDivElement, variant: "hero" | "ambient") {
  let renderer: Three.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {}; // No WebGL: the CSS background is enough.
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.innerWidth < 768;
  const density = small ? 0.5 : 1;
  const pixelRatio = Math.min(window.devicePixelRatio, 1.75);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

  const deep = new THREE.Color("#c48a2a");
  const bright = new THREE.Color("#f7e4b0");

  function makeMaterial(vertex: string, opts: { size: number; opacity: number; ocean?: boolean }) {
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: POINT_FRAGMENT,
      defines: opts.ocean ? { OCEAN: "" } : {},
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uAssemble: { value: reduceMotion ? 1 : 0 },
        uPixelRatio: { value: pixelRatio },
        uSize: { value: opts.size },
        uOpacity: { value: opts.opacity },
        uColorA: { value: deep },
        uColorB: { value: bright },
      },
    });
  }

  function makePoints(positions: Pts, material: Three.ShaderMaterial, scatter: number) {
    const count = positions.length / 3;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const seeds = new Float32Array(count);
    const starts = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      seeds[i] = Math.random();
      starts[i * 3] = positions[i * 3] + rand(-scatter, scatter);
      starts[i * 3 + 1] = positions[i * 3 + 1] + rand(-scatter, scatter) * 0.6;
      starts[i * 3 + 2] = positions[i * 3 + 2] + rand(-scatter, scatter);
    }
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aStart", new THREE.BufferAttribute(starts, 3));
    return new THREE.Points(geometry, material);
  }

  const materials: Three.ShaderMaterial[] = [];
  const geometries: Three.BufferGeometry[] = [];

  // --- Particle ocean ---
  const ocean: Pts = [];
  const cols = Math.round(230 * density);
  const rows = Math.round(150 * density);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -24 + (48 * i) / cols + rand(-0.08, 0.08);
      const z = -32 + (38 * j) / rows + rand(-0.08, 0.08);
      ocean.push(x, -1.55, z);
    }
  }
  const oceanMaterial = makeMaterial(OCEAN_VERTEX, { size: 2.6, opacity: variant === "hero" ? 1 : 0.75, ocean: true });
  const oceanPoints = makePoints(ocean, oceanMaterial, 0);
  scene.add(oceanPoints);
  materials.push(oceanMaterial);
  geometries.push(oceanPoints.geometry);

  // --- Floating dust ---
  const dust: Pts = [];
  for (let i = 0; i < 1400 * density; i++) dust.push(rand(-14, 14), rand(-1.5, 7), rand(-20, 4));
  const dustMaterial = makeMaterial(POINT_VERTEX, { size: 1.3, opacity: 0.45 });
  const dustPoints = makePoints(dust, dustMaterial, 0);
  scene.add(dustPoints);
  materials.push(dustMaterial);
  geometries.push(dustPoints.geometry);

  // --- Scales of justice (hero only) ---
  const scales = new THREE.Group();
  const beamGroup = new THREE.Group();
  const leftHang = new THREE.Group();
  const rightHang = new THREE.Group();
  const scalesMaterial = makeMaterial(POINT_VERTEX, { size: 2.1, opacity: 1 });
  const PIVOT_Y = 2.05;
  const BEAM = 1.75;

  if (variant === "hero") {
    const body: Pts = [];
    disc(body, 3200 * density, 1.15, -1.25, 0.12); // lower base
    disc(body, 2000 * density, 0.75, -1.13, 0.12); // upper base
    rod(body, 2600 * density, 0.085, -1.0, PIVOT_Y); // pillar
    ball(body, 500 * density, 0.17, 0, PIVOT_Y + 0.32); // top ornament
    ball(body, 300 * density, 0.1, 0, PIVOT_Y); // pivot
    const bodyPoints = makePoints(body, scalesMaterial, 6);
    scales.add(bodyPoints);
    geometries.push(bodyPoints.geometry);

    const beam: Pts = [];
    bar(beam, 2200 * density, BEAM + 0.1, 0);
    const beamPoints = makePoints(beam, scalesMaterial, 6);
    beamGroup.add(beamPoints);
    beamGroup.position.y = PIVOT_Y;
    scales.add(beamGroup);
    geometries.push(beamPoints.geometry);

    for (const hang of [leftHang, rightHang]) {
      const pan: Pts = [];
      hangingPan(pan, 900 * density, 2600 * density);
      const panPoints = makePoints(pan, scalesMaterial, 6);
      hang.add(panPoints);
      scales.add(hang);
      geometries.push(panPoints.geometry);
    }
    scene.add(scales);
    materials.push(scalesMaterial);
  }

  // --- Layout: scales to the right of the hero text on wide screens ---
  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Wide screens: scales on the right of the title. Phones: smaller, behind and below the text.
    scales.position.set(w >= 1024 ? 2.35 : 0.6, w >= 1024 ? 0 : -0.6, w >= 1024 ? 0 : -2);
    scales.scale.setScalar(w >= 1024 ? 0.86 : 0.75);
  }
  layout();
  window.addEventListener("resize", layout);

  // --- Mouse parallax ---
  const mouse = { x: 0, y: 0 };
  function onMove(e: PointerEvent) {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  }
  window.addEventListener("pointermove", onMove);

  // --- Animation loop ---
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let frame = 0;

  function scrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.scrollY / max) : 0;
  }

  function render() {
    const t = reduceMotion ? 8 : clock.getElapsedTime();
    for (const m of materials) {
      m.uniforms.uTime.value = t;
      if (!reduceMotion) m.uniforms.uAssemble.value = Math.min(1, t / 2.6);
    }

    if (variant === "hero") {
      // The beam sways gently; the pans hang straight down from its ends.
      const tilt = reduceMotion ? 0.05 : 0.07 * Math.sin(t * 0.55);
      beamGroup.rotation.z = tilt;
      leftHang.position.set(-BEAM * Math.cos(tilt), PIVOT_Y - BEAM * Math.sin(tilt), 0);
      rightHang.position.set(BEAM * Math.cos(tilt), PIVOT_Y + BEAM * Math.sin(tilt), 0);
      scales.rotation.y = reduceMotion ? -0.35 : -0.35 + Math.sin(t * 0.15) * 0.25;

      // Scrolling orbits the camera and dims the scales so the panels stay readable.
      const p = scrollProgress();
      const angle = p * 1.1;
      const dist = 8 + p * 4;
      camPos.set(
        Math.sin(angle) * dist + mouse.x * 0.8,
        2.1 + p * 2.5 - mouse.y * 0.5,
        Math.cos(angle) * dist,
      );
      look.set(0, 0.35 - p * 0.8, 0);
      scalesMaterial.uniforms.uOpacity.value = (window.innerWidth >= 1024 ? 1 : 0.55) * (1 - p * 0.55);
    } else {
      camPos.set(mouse.x * 0.8, 1.6 - mouse.y * 0.4, 9);
      look.set(0, -0.5, -4);
    }
    camera.position.lerp(camPos, reduceMotion ? 1 : 0.06);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function loop() {
    render();
    frame = requestAnimationFrame(loop);
  }

  if (reduceMotion) {
    // One still frame, redrawn only when needed.
    render();
    const redraw = () => render();
    window.addEventListener("scroll", redraw, { passive: true });
    window.addEventListener("resize", redraw);
    const stop = () => {
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
    };
    return () => {
      stop();
      dispose();
    };
  }
  loop();

  function dispose() {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", layout);
    window.removeEventListener("pointermove", onMove);
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  return dispose;
}
