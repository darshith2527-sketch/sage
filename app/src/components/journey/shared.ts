import type * as Three from "three";

// Shared pieces for the home page's 3D journey: quality tiers, GLSL helpers, text drawn into
// textures, and the stage interface every scene implements.

export type T3 = typeof Three;

// ---------- Quality tiers ----------
// Tier 1 = full quality … tier 4 = lightest. Picked from the device up front and stepped down
// at runtime if the GPU is too slow. Force one with ?tier=1..4 in the URL.
export type Tier = 1 | 2 | 3 | 4;
export const TIERS = {
  pixelRatio: [2, 1.75, 1.5, 1.25],
  rayScale: [0.5, 0.4, 0.35, 0.25], // light-ray pass resolution, relative to the screen
  rays: [true, true, true, false],
  fluidRes: [128, 64, 0, 0], // 0 = no fluid simulation
  particles: [1, 0.6, 0.35, 0.15],
};
export const pick = <T,>(list: T[], tier: Tier) => list[tier - 1];

export function detectTier(renderer: Three.WebGLRenderer): { tier: Tier; reason: string } {
  const forced = Number(new URLSearchParams(window.location.search).get("tier"));
  if (forced >= 1 && forced <= 4) return { tier: forced as Tier, reason: "forced" };
  const limits: { tier: Tier; reason: string }[] = [{ tier: 1, reason: "no limits" }];
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) limits.push({ tier: 4, reason: `software GPU (${gpu})` });
  const cores = navigator.hardwareConcurrency || 0;
  if (cores && cores <= 2) limits.push({ tier: 3, reason: `${cores} CPU cores` });
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory && memory <= 2) limits.push({ tier: 4, reason: `${memory}GB memory` });
  else if (memory && memory <= 4) limits.push({ tier: 3, reason: `${memory}GB memory` });
  if (window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820)
    limits.push({ tier: 2, reason: "phone or tablet" });
  if (!renderer.capabilities.isWebGL2) limits.push({ tier: 3, reason: "WebGL 1 only" });
  return limits.reduce((worst, l) => (l.tier > worst.tier ? l : worst));
}

// ---------- GLSL helpers ----------
export const GLSL_NOISE = /* glsl */ `
  float hash12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float hash13(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float vnoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y);
    float b = mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y);
    return mix(a, b, u.z);
  }
`;

// A full-screen triangle-pair whose shader writes clip space directly.
export const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ---------- Fonts ----------
export const FONT = {
  bold: '700 {px}px "Excon", "Arial Black", sans-serif',
  medium: '500 {px}px "Excon", "Helvetica Neue", Arial, sans-serif',
  regular: '400 {px}px "Excon", "Helvetica Neue", Arial, sans-serif',
  hud: '600 {px}px "Antonio Variable", "Arial Narrow", sans-serif',
};
export const font = (face: string, px: number) => face.replace("{px}", String(px));

export async function loadJourneyFonts() {
  await Promise.all(
    ['700 64px "Excon"', '500 32px "Excon"', '400 32px "Excon"', '600 32px "Antonio Variable"'].map((f) =>
      document.fonts.load(f).catch(() => undefined),
    ),
  );
}

// Draws wrapped text; returns the y after the last line.
export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(/\s+/);
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = w;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

// Colours are used exactly as written (display values): the journey's shaders work in display
// space, so three.js's sRGB-to-linear conversion must not be applied to them.
export const hexColor = (THREE: T3, hex: string) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

export function canvasTexture(THREE: T3, canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

// ---------- Stages ----------
export type FrameInfo = {
  time: number; // seconds since start (frozen with reduced motion)
  dt: number;
  pointer: { x: number; y: number; inside: boolean }; // 0..1, y up
  width: number;
  height: number;
  pixelRatio: number;
};

// A clickable spot a stage exposes; the engine positions an invisible DOM link over it.
export type Hotspot = { x: number; y: number; r: number; visible: boolean };

export interface Stage {
  readonly name: string;
  readonly camera: Three.PerspectiveCamera;
  readonly length: number; // scroll distance through this stage
  readonly endZone: number; // last stretch that hands over to the next stage (0 = final stage)
  setScroll(s: number): void; // place the camera for a (damped) scroll position
  update(frame: FrameInfo): void;
  render(renderer: Three.WebGLRenderer, target: Three.WebGLRenderTarget): void;
  resize(width: number, height: number, pixelRatio: number): void;
  hotspots?(): Hotspot[];
  setHover?(index: number | null): void;
  scrollFor?(index: number): number; // scroll position that faces hotspot i
  splat?(x: number, y: number, dx: number, dy: number): void;
  setTier?(tier: Tier): void;
  dispose(): void;
}
