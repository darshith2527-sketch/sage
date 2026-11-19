import type * as Three from "three";
import { createFibers } from "./fibers";
import { createGlassDisc, projectDisc, type GlassDisc } from "./glass";
import { FONT, font, hexColor, pick, QUAD_VERTEX, TIERS, wrapText, type FrameInfo, type Hotspot, type Stage, type T3, type Tier } from "./shared";
import { createSky } from "./sky";

// Stage 3, the destination: a column of light pours down and spreads across the floor; in front
// of it a curved glass panel with a message, and round glass buttons for the social profiles.

export type Social = { label: "GitHub" | "LinkedIn" | "Instagram" | "X"; href: string };

const LENGTH = 10;
const BUTTON_R = 1.0;

// Outline icons (the same shapes as the site footer), drawn on a 24-unit grid.
function drawIcon(ctx: CanvasRenderingContext2D, label: Social["label"], cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = "#E6F0FF";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const stroke = (d: string) => ctx.stroke(new Path2D(d));
  if (label === "GitHub")
    stroke(
      "M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.8 0-1 .4-1.9 1-2.6-.1-.3-.4-1.2.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.4.2 2.3.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.3 4.6-4.4 4.8.3.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z",
    );
  else if (label === "Instagram") {
    stroke("M8 3.5h8a4.5 4.5 0 0 1 4.5 4.5v8a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 16V8A4.5 4.5 0 0 1 8 3.5z");
    stroke("M15.8 12a3.8 3.8 0 1 1-7.6 0 3.8 3.8 0 0 1 7.6 0z");
    stroke("M17 7v.1");
  } else if (label === "LinkedIn") {
    stroke("M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z");
    stroke("M7.5 10v6.5M7.5 7.3v.1M11 16.5V10m0 3c0-1.7 1-3 2.6-3 1.5 0 2.4 1 2.4 3v3.5");
  } else stroke("M4 4l16 16M20 4L4 20");
  ctx.restore();
}

// The message panel: a rounded rectangle of frosted glass, slightly curved.
const PANEL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  uniform float uBend;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z -= p.x * p.x * uBend;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const PANEL_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uLabel;
  uniform vec2 uRes;
  uniform vec2 uSize;
  uniform float uReveal;
  uniform vec3 uFill;
  uniform vec3 uBorder;
  uniform vec3 uGlow;
  float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = box(p, uSize * 0.5 - 0.02, 0.35);
    float inside = 1.0 - smoothstep(-0.01, 0.01, d);
    vec3 frost = texture2D(uScene, gl_FragCoord.xy / uRes, 4.5).rgb * 0.55;
    vec3 col = frost * 0.75 + uFill * 0.2;
    col += uGlow * smoothstep(-0.6, 0.0, d) * 0.2;
    col += uBorder * smoothstep(-0.05, -0.02, d) * (1.0 - smoothstep(-0.015, 0.0, d)) * 0.9;
    vec4 label = texture2D(uLabel, vUv);
    col = mix(col, label.rgb, label.a);
    float a = inside * uReveal;
    gl_FragColor = vec4(col * a, a);
  }
`;
const COPY = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  void main() { gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0); }
`;

export function createContactStage(THREE: T3, renderer: Three.WebGLRenderer, env: { tier: Tier; socials: Social[]; message: [string, string] }): Stage {
  const camera = new THREE.PerspectiveCamera(80, 1, 0.5, 150);
  const world = new THREE.Scene();
  const sky = createSky(THREE, {
    top: "#0e2257",
    bottom: "#081638",
    glows: [
      { color: "#1f5fff", azimuth: 0, elevation: 30, size: 0.45, intensity: 0.05 },
      { color: "#3a4ae8", azimuth: -100, elevation: 10, size: 0.5, intensity: 0.025 },
      { color: "#18b8d0", azimuth: 120, elevation: -2, size: 0.35, intensity: 0.03 },
    ],
  });
  world.add(sky.mesh);

  let tier = env.tier;
  let fibers = createFibers(THREE, { strands: Math.round(1300 * Math.max(0.3, pick(TIERS.particles, tier))), segments: 40 });
  world.add(fibers.points);

  const worldRT = new THREE.WebGLRenderTarget(1, 1, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const glassScene = new THREE.Scene();
  const quad = new THREE.PlaneGeometry(2, 2);
  const copyMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader: COPY, uniforms: { uMap: { value: worldRT.texture } }, depthTest: false, depthWrite: false });
  const copy = new THREE.Mesh(quad, copyMat);
  copy.frustumCulled = false;
  copy.renderOrder = -100;
  glassScene.add(copy);

  // --- Message panel ---
  const panelSize = { w: 9, h: 1.9 };
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 1800;
  labelCanvas.height = 380;
  const lc = labelCanvas.getContext("2d")!;
  lc.textAlign = "center";
  lc.fillStyle = "#E6F0FF";
  lc.font = font(FONT.medium, 82);
  lc.fillText(env.message[0], 900, 165);
  lc.fillStyle = "#B5CFFF";
  lc.font = font(FONT.regular, 62);
  wrapText(lc, env.message[1], 900, 265, 1650, 72);
  const panelLabel = new THREE.CanvasTexture(labelCanvas);
  panelLabel.colorSpace = THREE.NoColorSpace;
  panelLabel.anisotropy = 4;
  const panelMat = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uScene: { value: worldRT.texture },
      uLabel: { value: panelLabel },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSize: { value: new THREE.Vector2(panelSize.w, panelSize.h) },
      uReveal: { value: 0 },
      uBend: { value: 0.012 },
      uFill: { value: hexColor(THREE, "#2d5399") },
      uBorder: { value: hexColor(THREE, "#6bb0f9") },
      uGlow: { value: hexColor(THREE, "#2c79ff") },
    },
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelSize.w, panelSize.h, 48, 1), panelMat);
  panel.position.set(0, 7.4, 6);
  panel.renderOrder = 9;
  panel.frustumCulled = false;
  glassScene.add(panel);

  // --- Social buttons ---
  const gap = 2.4;
  const buttons: GlassDisc[] = env.socials.map((s, i) => {
    const disc = createGlassDisc(THREE, BUTTON_R, (ctx, size) => drawIcon(ctx, s.label, size / 2, size / 2, size * 0.36));
    disc.mesh.position.set((i - (env.socials.length - 1) / 2) * gap, 5.0, 6.2);
    glassScene.add(disc.mesh);
    return disc;
  });

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let clock = 0;
  function place(s: number) {
    const k = s / LENGTH;
    camera.position.set(0, 7.2 - k * 0.6, 22 - k * 6);
    camera.lookAt(0, 6.4, 0);
    camera.updateMatrixWorld();
  }
  place(0);

  return {
    name: "contact",
    camera,
    length: LENGTH,
    endZone: 0,
    setScroll(s) {
      place(s);
    },
    resize(w, h, dpr) {
      width = w;
      height = h;
      pixelRatio = dpr;
      camera.aspect = w / h;
      camera.fov = h > w ? 100 : 80;
      camera.updateProjectionMatrix();
      worldRT.setSize(Math.round(w * dpr), Math.round(h * dpr));
      panelMat.uniforms.uRes.value.set(w * dpr, h * dpr);
    },
    setTier(next) {
      tier = next;
      world.remove(fibers.points);
      fibers.dispose();
      fibers = createFibers(THREE, { strands: Math.round(1300 * Math.max(0.3, pick(TIERS.particles, tier))), segments: 40 });
      world.add(fibers.points);
    },
    update(f: FrameInfo) {
      clock += f.dt;
      sky.update(f.time);
      fibers.update(f.time);
      fibers.setScale();
      // The panel and buttons fade in shortly after arriving.
      const reveal = THREE.MathUtils.smoothstep(clock, 0.6, 1.6);
      panelMat.uniforms.uReveal.value = reveal;
      buttons.forEach((b, i) => b.update(f.dt, THREE.MathUtils.smoothstep(clock, 1.0 + i * 0.12, 1.8 + i * 0.12), worldRT.texture, width * pixelRatio, height * pixelRatio));
    },
    render(r, target) {
      r.setClearColor(0x030915, 1);
      r.setRenderTarget(worldRT);
      r.render(world, camera);
      r.setRenderTarget(target);
      r.render(glassScene, camera);
    },
    hotspots(): Hotspot[] {
      return buttons.map((b) => {
        const p = projectDisc(THREE, b.mesh, BUTTON_R, camera, width, height);
        return { x: p.x, y: p.y, r: p.r, visible: p.inFront && clock > 1.2 };
      });
    },
    setHover(index) {
      buttons.forEach((b, i) => b.setHover(i === index));
    },
    dispose() {
      sky.dispose();
      fibers.dispose();
      for (const b of buttons) b.dispose();
      panel.geometry.dispose();
      panelMat.dispose();
      panelLabel.dispose();
      worldRT.dispose();
      quad.dispose();
      copyMat.dispose();
    },
  };
}
