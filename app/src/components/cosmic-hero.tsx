"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type * as Three from "three";

// The home page's opening screen: deep navy space full of drifting particles, and
// "SAGE" in extruded letters that sit in the dark until a blue light (following the
// pointer, or drifting on its own) catches them and throws light rays through the haze.
// Drawn with WebGL (Three.js). Without WebGL, the plain heading and gradient show instead.

const TITLE = "SAGE";
const TITLE_Y = 0.49; // title centre, as a fraction of the screen height from the top

export default function CosmicHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const mount = mountRef.current;
    if (!section || !mount) return;
    let cleanup = () => {};
    let cancelled = false;
    Promise.all([
      import("three"),
      document.fonts.load('700 100px "Excon"').catch(() => undefined),
    ]).then(([THREE]) => {
      if (cancelled) return;
      cleanup = startHero(THREE, section, mount);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <section ref={sectionRef} aria-label="Sage" className="cosmic-hero relative h-[100svh] min-h-[480px] w-full overflow-hidden">
      <div ref={mountRef} aria-hidden className="absolute inset-0" />
      {/* The real heading. It is drawn by WebGL once that is running, and stays here for screen readers. */}
      <h1
        className="cosmic-title pointer-events-none absolute inset-x-0 text-center"
        style={{ top: `${TITLE_Y * 100}%` }}
      >
        Sage
      </h1>
      <div className="absolute inset-x-0 top-[81%] flex -translate-y-1/2 justify-center">
        <Link href="/#draft" className="cosmic-btn">
          Start the journey
        </Link>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--navy-950)]" />
    </section>
  );
}

// ---------- Shaders ----------

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Pass 1: the lettering, lit by the moving light. Drawn at half resolution into a buffer
// that pass 2 both shows and smears into light rays.
const TEXT_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uSharp;   // letters, crisp
  uniform sampler2D uSoft;    // letters, blurred (the out-of-focus look in the dark)
  uniform sampler2D uHaze;    // letters, very blurred (glow around them)
  uniform vec4 uRect;         // where the letter textures sit on screen (uv x, y, w, h)
  uniform vec2 uLight;        // light position (screen uv)
  uniform vec2 uCenter;       // title centre (screen uv)
  uniform float uAspect;      // width / height
  uniform float uRadius;      // light falloff, in screen heights
  uniform float uIntensity;
  uniform float uDepth;       // extrusion length
  uniform float uTime;

  float tex(sampler2D t, vec2 uv) {
    vec2 m = (uv - uRect.xy) / uRect.zw;
    if (m.x < 0.0 || m.y < 0.0 || m.x > 1.0 || m.y > 1.0) return 0.0;
    return texture2D(t, m).r;
  }

  void main() {
    vec2 uv = vUv;
    vec2 toLight = (uv - uLight) * vec2(uAspect, 1.0);
    float d = length(toLight);
    float lit = exp(-(d * d) / (uRadius * uRadius)) * uIntensity;
    float wide = exp(-(d * d) / (uRadius * uRadius * 9.0)) * uIntensity;

    float sharp = tex(uSharp, uv);
    float soft = tex(uSoft, uv);
    // In the dark the letters are soft and hazy; under the light they come into focus.
    float face = mix(soft * 0.85, sharp, smoothstep(0.04, 0.45, lit));

    // Extrusion: the sides run back towards the title's vanishing point.
    float side = 0.0;
    vec2 back = uv - uCenter;
    for (int i = 1; i <= 10; i++) {
      float t = float(i) / 10.0;
      side = max(side, tex(uSharp, uv + back * uDepth * t) * (1.0 - t * 0.55));
    }
    side *= 1.0 - sharp;

    // The light shines from the pointer, so letter faces turned towards it catch more.
    float edge = clamp(dot(normalize(back + 1e-4), normalize(uLight - uCenter + 1e-4)), 0.0, 1.0);

    vec3 unlit = vec3(0.125, 0.18, 0.46);
    vec3 litFace = vec3(0.30, 0.42, 1.05);
    vec3 hot = vec3(0.40, 0.55, 1.0);
    // A slow shimmer across the faces, so the lettering never looks printed.
    float shimmer = 0.92 + 0.08 * sin(uv.x * 40.0 - uTime * 0.8);
    vec3 faceColor = (mix(unlit, litFace, clamp(lit * 1.1, 0.0, 1.0)) + hot * pow(lit, 4.0) * 0.25) * shimmer;
    vec3 sideColor = vec3(0.05, 0.08, 0.24) + vec3(0.12, 0.18, 0.55) * (lit * 0.55 + wide * 0.15) * (0.6 + 0.4 * edge);

    float haze = tex(uHaze, uv);
    vec3 glow = vec3(0.14, 0.22, 0.75) * haze * (0.03 + wide * 0.5);

    vec3 col = faceColor * face + sideColor * side + glow;
    float alpha = clamp(face + side * 0.9 + haze * 0.05, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Pass 2: background, haze, light rays and the lettering, composed on screen.
const SCENE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uText;
  uniform vec2 uLight;
  uniform vec2 uCenter;
  uniform vec2 uParallax;
  uniform float uAspect;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uRayLength;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - uCenter) * vec2(uAspect, 1.0);

    // Deep navy, a little lighter towards the top, darkest at the bottom.
    vec3 col = mix(vec3(0.020, 0.052, 0.130), vec3(0.055, 0.115, 0.300), smoothstep(0.0, 1.0, uv.y));
    col = mix(col, vec3(0.048, 0.098, 0.255), smoothstep(0.75, 0.35, abs(uv.y - 0.6)) * 0.35);

    // Slow atmospheric haze.
    vec2 hp = uv * vec2(uAspect, 1.0) * 2.2 + uParallax * 0.6;
    float h = fbm(hp + vec2(uTime * 0.012, uTime * 0.006));
    h = h * 0.6 + 0.4 * fbm(hp * 0.5 - vec2(uTime * 0.008, 0.0));
    col += vec3(0.035, 0.055, 0.16) * smoothstep(0.35, 0.85, h) * 0.6;

    // A soft horizontal band of light around the title, breathing slowly.
    float breathe = 0.85 + 0.15 * sin(uTime * 0.35);
    float band = exp(-pow(p.x / 0.62, 2.0) - pow(p.y / 0.11, 2.0));
    float bandWide = exp(-pow(p.x / 1.1, 2.0) - pow(p.y / 0.28, 2.0));
    col += vec3(0.08, 0.12, 0.40) * band * 0.38 * breathe;
    col += vec3(0.04, 0.065, 0.22) * bandWide * 0.5;

    // Light rays: the lit lettering smeared outwards, away from the light.
    vec2 delta = (uv - uLight) * uRayLength / 48.0;
    vec2 c = uv;
    float decay = 1.0;
    vec3 rays = vec3(0.0);
    for (int i = 0; i < 48; i++) {
      c -= delta;
      vec4 s = texture2D(uText, c);
      float lum = dot(s.rgb, vec3(0.2, 0.3, 0.5));
      rays += s.rgb * smoothstep(0.3, 0.75, lum) * decay;
      decay *= 0.964;
    }
    rays /= 48.0;
    vec4 t = texture2D(uText, uv);
    col += rays * vec3(0.7, 0.82, 1.3) * 2.0 * (1.0 - t.a * 0.7);

    // Glow of the light itself, very faint.
    float dl = length((uv - uLight) * vec2(uAspect, 1.0));
    col += vec3(0.10, 0.16, 0.55) * exp(-dl * dl / 0.02) * 0.22 * uIntensity;

    // The lettering on top.
    col = col * (1.0 - t.a * 0.55) + t.rgb * 0.9;

    // Vignette and a touch of grain (also stops colour banding).
    float v = smoothstep(1.35, 0.35, length((uv - 0.5) * vec2(uAspect * 0.8, 1.0)));
    col *= mix(0.62, 1.0, v);
    col += (hash(uv * 1000.0 + fract(uTime)) - 0.5) / 160.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const STAR_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aDepth;
  attribute float aGlow;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uParallax;
  uniform vec2 uLight;
  uniform float uAspect;
  uniform float uIntensity;
  varying float vAlpha;
  varying float vGlow;
  varying float vLit;
  varying float vSeed;
  void main() {
    vec2 p = position.xy;
    // Slow drift: deeper particles move less.
    float speed = 0.004 + aDepth * 0.01;
    p.x += uTime * speed * (aSeed - 0.35);
    p.y += uTime * speed * 0.5 + sin(uTime * 0.2 + aSeed * 40.0) * 0.006 * aDepth;
    p = mod(p + 1.1, 2.2) - 1.1;
    p += uParallax * (0.15 + aDepth) * 0.05;
    gl_Position = vec4(p, 0.0, 1.0);

    vec2 uv = p * 0.5 + 0.5;
    float d = length((uv - uLight) * vec2(uAspect, 1.0));
    vLit = exp(-d * d / 0.03) * uIntensity;

    gl_PointSize = aSize * uPixelRatio * (1.0 + vLit * 0.6);
    vAlpha = (0.15 + aDepth * 0.6);
    vGlow = aGlow;
    vSeed = aSeed;
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying float vAlpha;
  varying float vGlow;
  varying float vLit;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    float a = mix(core * core, exp(-d * d * 4.0) * 0.55 + smoothstep(0.3, 0.0, d) * 0.35, vGlow);
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + vSeed * 1.8) + vSeed * 70.0);
    vec3 col = mix(vec3(0.42, 0.55, 1.0), vec3(0.30, 0.48, 1.0), vGlow);
    col = mix(col, vec3(0.62, 0.86, 1.0), clamp(vLit * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(col, a * vAlpha * twinkle * (1.0 + vLit * 2.0));
  }
`;

// ---------- The scene ----------

function startHero(THREE: typeof Three, section: HTMLElement, mount: HTMLDivElement): () => void {
  let renderer: Three.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return () => {}; // No WebGL: the CSS fallback stays.
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x050c22, 1);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  mount.appendChild(renderer.domElement);

  const camera = new THREE.Camera(); // every shader writes clip-space positions itself
  const quad = new THREE.PlaneGeometry(2, 2);

  // --- Letter textures ---
  const sharpCanvas = document.createElement("canvas");
  const softCanvas = document.createElement("canvas");
  const hazeCanvas = document.createElement("canvas");
  const sharpTex = new THREE.CanvasTexture(sharpCanvas);
  const softTex = new THREE.CanvasTexture(softCanvas);
  const hazeTex = new THREE.CanvasTexture(hazeCanvas);
  for (const t of [sharpTex, softTex, hazeTex]) {
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
  }

  const textTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const textUniforms = {
    uSharp: { value: sharpTex },
    uSoft: { value: softTex },
    uHaze: { value: hazeTex },
    uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uLight: { value: new THREE.Vector2(0.5, 1 - TITLE_Y) },
    uCenter: { value: new THREE.Vector2(0.5, 1 - TITLE_Y) },
    uAspect: { value: 1 },
    uRadius: { value: 0.12 },
    uIntensity: { value: 0 },
    uDepth: { value: 0.07 },
    uTime: { value: 0 },
  };
  const textMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: TEXT_FRAGMENT,
    uniforms: textUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const textScene = new THREE.Scene();
  textScene.add(new THREE.Mesh(quad, textMaterial));

  const sceneUniforms = {
    uText: { value: textTarget.texture },
    uLight: textUniforms.uLight,
    uCenter: textUniforms.uCenter,
    uAspect: textUniforms.uAspect,
    uIntensity: textUniforms.uIntensity,
    uParallax: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uRayLength: { value: 0.68 },
  };
  const sceneMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: SCENE_FRAGMENT,
    uniforms: sceneUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new THREE.Scene();
  const backdrop = new THREE.Mesh(quad, sceneMaterial);
  backdrop.renderOrder = 0;
  scene.add(backdrop);

  // --- Particles ---
  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    uniforms: {
      uTime: sceneUniforms.uTime,
      uPixelRatio: { value: pixelRatio },
      uParallax: sceneUniforms.uParallax,
      uLight: textUniforms.uLight,
      uAspect: textUniforms.uAspect,
      uIntensity: textUniforms.uIntensity,
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  let starGeometry = new THREE.BufferGeometry();
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = 1;
  stars.frustumCulled = false;
  scene.add(stars);

  function buildStars(width: number, height: number) {
    // Scale the count with screen area, fewer on small or low-power devices.
    const cores = navigator.hardwareConcurrency || 4;
    const budget = width < 768 || cores <= 4 ? 0.55 : 1;
    const count = Math.round(Math.min(5000, Math.max(900, (width * height) / 300)) * budget);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    const depth = new Float32Array(count);
    const glow = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // More dust in the lower half, like the ground of the scene.
      const lower = Math.random() < 0.55;
      pos[i * 3] = Math.random() * 2.2 - 1.1;
      pos[i * 3 + 1] = lower ? -1.1 + Math.pow(Math.random(), 1.6) * 1.1 : Math.random() * 2.2 - 1.1;
      const r = Math.random();
      depth[i] = Math.pow(Math.random(), 1.8);
      seed[i] = Math.random();
      if (r < 0.012) {
        glow[i] = 1;
        size[i] = 7 + Math.random() * 9; // a few soft, out-of-focus blue orbs
        depth[i] = 0.35 + Math.random() * 0.4;
      } else if (r < 0.09) {
        size[i] = 1.8 + Math.random() * 1.4;
      } else {
        size[i] = 1.0 + Math.random() * 1.1; // fine dust, some almost invisible
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1));
    g.setAttribute("aGlow", new THREE.BufferAttribute(glow, 1));
    starGeometry.dispose();
    starGeometry = g;
    stars.geometry = g;
  }

  // --- Layout: size everything to the section ---
  let width = 0;
  let height = 0;
  let capPx = 80;
  let textHalf = 0.15; // half the word's width, as a fraction of the screen width

  function drawLetters() {
    // Title size: the letters' cap height is ~6.5% of the width on desktop (as in the
    // reference), larger on phones so the word stays readable.
    capPx = Math.min(Math.max(width * 0.065, Math.min(width * 0.15, 62)), height * 0.14);
    const probe = sharpCanvas.getContext("2d")!;
    probe.font = `700 100px "Excon", "Arial Black", sans-serif`;
    const capRatio = probe.measureText("H").actualBoundingBoxAscent / 100 || 0.7;
    const fontPx = capPx / capRatio;
    probe.font = `700 ${fontPx}px "Excon", "Arial Black", sans-serif`;
    const spacing = fontPx * 0.025;
    if ("letterSpacing" in probe) (probe as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    const textW = probe.measureText(TITLE).width;
    textHalf = textW / 2 / width;

    // The letter textures cover a box around the word, with room for the glow.
    const boxW = Math.min(width, textW + capPx * 3);
    const boxH = Math.min(height, capPx * 3.2);
    const res = Math.min(pixelRatio, 1.5);
    sharpCanvas.width = Math.ceil(boxW * res);
    sharpCanvas.height = Math.ceil(boxH * res);
    const ctx = sharpCanvas.getContext("2d")!;
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, boxW, boxH);
    ctx.font = `700 ${fontPx}px "Excon", "Arial Black", sans-serif`;
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    // Centre the cap height (and nudge for the trailing letter spacing).
    ctx.fillText(TITLE, boxW / 2 + spacing / 2, boxH / 2 + capPx / 2);

    blurInto(softCanvas, sharpCanvas, 0.22, capPx * 0.06);
    blurInto(hazeCanvas, sharpCanvas, 0.08, capPx * 0.3);
    // The canvases changed size: free the old GPU copies so they are re-created at the new size.
    for (const t of [sharpTex, softTex, hazeTex]) {
      t.dispose();
      t.needsUpdate = true;
    }

    const cx = 0.5;
    const cy = 1 - TITLE_Y;
    textUniforms.uRect.value.set(cx - boxW / width / 2, cy - boxH / height / 2, boxW / width, boxH / height);
    textUniforms.uRadius.value = (capPx * 1.05) / height;
  }

  function layout() {
    const rect = section.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    textTarget.setSize(Math.ceil((width * pixelRatio) / 2), Math.ceil((height * pixelRatio) / 2));
    textUniforms.uAspect.value = width / height;
    drawLetters();
    buildStars(width, height);
  }

  // --- The light: follows the pointer, and drifts across the word when left alone ---
  const pointer = { x: 0.5, y: 1 - TITLE_Y, lastMove: -1e9, inside: false };
  const light = { x: 0.5, y: 1 - TITLE_Y };
  const parallax = { x: 0, y: 0 };

  function onPointerMove(e: PointerEvent) {
    const rect = section.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    pointer.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (!pointer.inside) return;
    pointer.x = x;
    pointer.y = y;
    pointer.lastMove = performance.now();
  }
  function onPointerLeave() {
    pointer.inside = false;
  }

  let frame = 0;
  let running = false;
  let visible = true;
  let last = performance.now();
  const start = last;

  function render(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = (now - start) / 1000;
    sceneUniforms.uTime.value = time;
    textUniforms.uTime.value = time;

    // Idle path: a slow sweep across the word.
    const idle = !pointer.inside || now - pointer.lastMove > 3500;
    const target = idle
      ? { x: 0.5 + Math.sin(time * 0.23) * textHalf * 1.05, y: 1 - TITLE_Y + Math.sin(time * 0.41) * (capPx / height) * 0.35 }
      : pointer;
    const k = 1 - Math.exp(-dt * (idle ? 1.2 : 4.5));
    light.x += (target.x - light.x) * k;
    light.y += (target.y - light.y) * k;
    textUniforms.uLight.value.set(light.x, light.y);

    // Brighter when the light is near the word, dimmer far away; always gently pulsing.
    const dTitle = Math.hypot((light.x - 0.5) * (width / height), light.y - (1 - TITLE_Y));
    const near = Math.exp(-Math.pow(dTitle / 0.45, 2));
    const want = (0.55 + 0.45 * near) * (0.9 + 0.1 * Math.sin(time * 0.9));
    textUniforms.uIntensity.value += (want - textUniforms.uIntensity.value) * (1 - Math.exp(-dt * 1.5));

    // Parallax follows the pointer, very gently.
    const px = pointer.inside ? (pointer.x - 0.5) * 2 : 0;
    const py = pointer.inside ? (pointer.y - 0.5) * 2 : 0;
    parallax.x += (px - parallax.x) * (1 - Math.exp(-dt * 2));
    parallax.y += (py - parallax.y) * (1 - Math.exp(-dt * 2));
    sceneUniforms.uParallax.value.set(parallax.x, parallax.y);

    renderer.setRenderTarget(textTarget);
    renderer.render(textScene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    render(now);
    frame = requestAnimationFrame(loop);
  }
  function play() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  // Reduced motion: one still frame with the light resting on the word.
  function renderStill() {
    textUniforms.uIntensity.value = 0.85;
    light.x = 0.5 - (capPx * 0.8) / width;
    textUniforms.uLight.value.set(light.x, light.y);
    renderer.setRenderTarget(textTarget);
    renderer.render(textScene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  const resizeObserver = new ResizeObserver(() => {
    layout();
    if (reduceMotion) renderStill();
  });
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) play();
    else pause();
  });
  function onVisibilityChange() {
    if (document.hidden) pause();
    else play();
  }

  layout();
  section.dataset.webgl = "on";
  resizeObserver.observe(section);
  visibility.observe(section);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (reduceMotion) renderStill();
  else play();

  return () => {
    pause();
    resizeObserver.disconnect();
    visibility.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    delete section.dataset.webgl;
    starGeometry.dispose();
    quad.dispose();
    textMaterial.dispose();
    sceneMaterial.dispose();
    starMaterial.dispose();
    sharpTex.dispose();
    softTex.dispose();
    hazeTex.dispose();
    textTarget.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

// A cheap, smooth blur that works in every browser: shrink the image, then scale it back up.
function blurInto(target: HTMLCanvasElement, source: HTMLCanvasElement, scale: number, radiusPx: number) {
  const w = Math.max(2, Math.round(source.width * scale));
  const h = Math.max(2, Math.round(source.height * scale));
  const tiny = document.createElement("canvas");
  const steps = Math.max(1, Math.round(radiusPx / 6));
  tiny.width = Math.max(2, Math.round(w / steps));
  tiny.height = Math.max(2, Math.round(h / steps));
  const t = tiny.getContext("2d")!;
  t.imageSmoothingEnabled = true;
  t.imageSmoothingQuality = "high";
  t.drawImage(source, 0, 0, tiny.width, tiny.height);
  target.width = w;
  target.height = h;
  const c = target.getContext("2d")!;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(tiny, 0, 0, w, h);
}
