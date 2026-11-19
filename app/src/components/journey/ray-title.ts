import type * as Three from "three";
import { FONT, font, GLSL_NOISE, hexColor, QUAD_VERTEX, type T3 } from "./shared";

// The opening title. Its letters are never shown directly: they become a glow mask, and the
// light you see is rays streaming from that mask away from a light hidden far behind it.
//   1. mask   : the word (Excon Bold) + a soft halo, broken up by drifting streaks, drawn in
//               the title's own flat space (a "domain" 2.6 × 4.4 times the word's size)
//   2. screen : the mask placed in 3D at the title's position and rendered with the camera,
//               so moving the camera (or flying through it) behaves like a real object
//   3. rays   : from every pixel, 56 steps towards the hidden light, collecting the mask,
//               with a dithered start, a colour shift along the ray and flickering beams;
//               the pointer's fluid boosts the rays where it was stirred
//   4. composite: rays added onto the scene, the letters themselves flaring where stirred

const DOMAIN = { x: 2.6, y: 4.4 };
const MASK_WIDTH = 1024;
const REFERENCE_ASPECT = 414 / 85;

const MASK_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uLogo;
  uniform vec2 uDomain;
  uniform float uLogoAspect;
  uniform float uGlow;
  uniform float uCut;
  uniform float uHalo;
  uniform float uFilaments;
  uniform float uFlow;
  uniform vec2 uHaloScale;
  ${GLSL_NOISE}
  void main() {
    vec2 u = (vUv * 2.0 - 1.0) * uDomain;          // the word spans |u| < 1
    vec2 luv = u * 0.5 + 0.5;
    float inside = step(0.0, luv.x) * step(luv.x, 1.0) * step(0.0, luv.y) * step(luv.y, 1.0);
    float body = smoothstep(uCut, 1.0, inside * texture2D(uLogo, clamp(luv, 0.001, 0.999)).a);
    vec2 hq = u / (vec2(1.1, 2.0) * uHaloScale);
    float halo = exp(-dot(hq, hq) * 1.5) * uHalo;
    // Drifting streaks (ridges of two noise octaves) cut thin gaps into the light.
    vec2 g = u * vec2(uLogoAspect, 1.0) * 0.046;
    float n = vnoise(g * 3.0 + vec2(1.0, 0.4) * uFlow) * 0.75 + vnoise(g * 7.0 + vec2(-1.3, 0.8) * uFlow) * 0.25;
    float streak = smoothstep(0.8, 0.92, 1.0 - abs(n * 2.0 - 1.0));
    vec2 e = abs(vUv * 2.0 - 1.0);
    float edge = (1.0 - smoothstep(0.85, 1.0, e.x)) * (1.0 - smoothstep(0.85, 1.0, e.y));
    float k = (1.0 - uFilaments * streak) * edge;
    gl_FragColor = vec4(body * uGlow * k, halo * k, 0.0, 1.0);
  }
`;

const PLANE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const PLANE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMask;
  void main() {
    gl_FragColor = vec4(texture2D(uMask, vUv).rg, 0.0, 1.0);
  }
`;

const RAY_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMask;
  uniform sampler2D uDye;
  uniform vec2 uCore;
  uniform vec2 uRes;
  uniform float uAspect;
  uniform vec3 uColor;
  uniform float uGain;
  uniform float uDecay;
  uniform float uLen;
  uniform float uChroma;
  uniform float uShimmer;
  uniform float uShimmerT;
  uniform float uDyeBoost;
  uniform float uFade;
  ${GLSL_NOISE}
  void main() {
    vec2 uv = vUv;
    vec2 stepv = (uv - uCore) / 56.0 * uLen;
    vec2 c = uv - stepv * hash12(uv * uRes);   // dithered start: no visible step pattern

    vec2 dir = (uv - uCore) * vec2(uAspect, 1.0);
    float dist = length(dir);
    dir /= max(dist, 1e-4);
    float sh = vnoise(dir * 3.0 + vec2(1.0, 0.7) * uShimmerT) * 0.6 + vnoise(dir * 11.0 + vec2(-2.3, 1.6) * uShimmerT) * 0.4;
    float flicker = max(1.0 + uShimmer * (sh * 2.0 - 1.0) * 1.4, 0.0);
    flicker = mix(1.0, flicker, smoothstep(0.02, 0.2, dist));

    vec3 acc = vec3(0.0);
    float w = 1.0;
    for (int i = 0; i < 56; i++) {
      float n = float(i) / 56.0;
      // Along the ray the light shifts from blue-violet, through cyan, to warm white.
      vec3 spectral = clamp(vec3(-0.25 + 2.0 * n, 1.0 - abs(1.9 * n - 0.95), 1.35 - 2.1 * n), 0.0, 1.0) * 1.6;
      vec3 tint = mix(vec3(1.0), spectral, uChroma);
      vec2 m = texture2D(uMask, c).rg;
      vec3 d = texture2D(uDye, c).rgb;
      float boost = 1.0 + (1.0 - exp(-2.0 * max(d.r, max(d.g, d.b)))) * uDyeBoost;
      float f = mix(1.0, flicker, smoothstep(0.0, 0.15, n));
      acc += (m.r * f * boost + m.g) * w * tint;
      w *= uDecay;
      c -= stepv;
    }
    acc /= 28.0;
    vec3 col = uColor * acc * uGain * uFade;
    vec2 v = (uv - 0.5) * vec2(uAspect, 1.0);
    col *= 1.0 - 0.45 * smoothstep(0.4, 1.2, length(v));
    gl_FragColor = vec4(1.0 - exp(-col * 1.1), 1.0);
  }
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uRays;
  uniform sampler2D uMask;
  uniform sampler2D uDye;
  uniform float uBoost;
  void main() {
    vec3 rays = texture2D(uRays, vUv).rgb;
    vec3 d = texture2D(uDye, vUv).rgb;
    float stir = 1.0 - exp(-2.0 * max(d.r, max(d.g, d.b)));
    float m = clamp(texture2D(uMask, vUv).r, 0.0, 1.0);
    gl_FragColor = vec4(rays * (1.0 + stir * m * uBoost), 1.0);
  }
`;

export type RayTitleOptions = {
  text: string;
  rayColor?: string;
  tintColor?: string;
  tintMix?: number;
  glow?: number;
  cut?: number;
  halo?: number;
  filaments?: number;
  gain?: number;
  decay?: number;
  length?: number;
  chroma?: number;
  lightDepth?: number;
  lightSwing?: number;
  flow?: number;
  wobble?: number;
  shimmer?: number;
  shimmerSpeed?: number;
  fluidBoost?: number;
  fluidRayBoost?: number;
};

export function createRayTitle(THREE: T3, opts: RayTitleOptions, still: Three.Texture) {
  const o = {
    rayColor: "#829be8",
    tintColor: "#4a6cff",
    tintMix: 0.5,
    glow: 1,
    cut: 0.15,
    halo: 1,
    filaments: 0.35,
    gain: 0.4,
    decay: 0.92,
    length: 1,
    chroma: 0.55,
    lightDepth: 60,
    lightSwing: 2,
    flow: 0.12,
    wobble: 0.006,
    shimmer: 0.75,
    shimmerSpeed: 0.5,
    fluidBoost: 1.6,
    fluidRayBoost: 3,
    ...opts,
  };

  // --- The word, tightly cropped to its cap height ---
  const logoCanvas = document.createElement("canvas");
  const probe = logoCanvas.getContext("2d")!;
  const px = 256;
  probe.font = font(FONT.bold, px);
  const cap = probe.measureText("H").actualBoundingBoxAscent || px * 0.7;
  const metrics = probe.measureText(o.text);
  const left = metrics.actualBoundingBoxLeft;
  const textW = metrics.actualBoundingBoxRight + left;
  const pad = 4;
  logoCanvas.width = Math.ceil(textW + pad * 2);
  logoCanvas.height = Math.ceil(cap + pad * 2);
  const lctx = logoCanvas.getContext("2d")!;
  lctx.font = font(FONT.bold, px);
  lctx.fillStyle = "#fff";
  lctx.textBaseline = "alphabetic";
  lctx.fillText(o.text, pad + left, pad + cap);
  const logoTex = new THREE.CanvasTexture(logoCanvas);
  logoTex.minFilter = THREE.LinearFilter;
  logoTex.generateMipmaps = false;
  const logoAspect = logoCanvas.width / logoCanvas.height;

  // --- 1. Mask, in the title's own space ---
  const maskRT = new THREE.WebGLRenderTarget(MASK_WIDTH, Math.round((MASK_WIDTH * DOMAIN.y) / (DOMAIN.x * logoAspect)), {
    depthBuffer: false,
    type: THREE.HalfFloatType,
  });
  const quad = new THREE.PlaneGeometry(2, 2);
  const flatCamera = new THREE.Camera();
  const maskMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: MASK_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uLogo: { value: logoTex },
      uDomain: { value: new THREE.Vector2(DOMAIN.x, DOMAIN.y) },
      uLogoAspect: { value: logoAspect },
      uGlow: { value: o.glow },
      uCut: { value: o.cut },
      uHalo: { value: o.halo },
      uFilaments: { value: o.filaments },
      uFlow: { value: 0 },
      // The halo keeps the width of the reference's 7-letter name (aspect ≈ 4.87), so the
      // light spreads across the screen the same way even though SAGE is shorter.
      uHaloScale: { value: new THREE.Vector2(Math.max(1, REFERENCE_ASPECT / logoAspect), 1) },
    },
  });
  const maskScene = new THREE.Scene();
  maskScene.add(new THREE.Mesh(quad, maskMaterial));

  // --- 2. The mask as an object in the world ---
  const anchor = new THREE.Object3D(); // the title's position/scale in the stage
  const planeMaterial = new THREE.ShaderMaterial({
    vertexShader: PLANE_VERTEX,
    fragmentShader: PLANE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uMask: { value: maskRT.texture } },
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), planeMaterial);
  plane.frustumCulled = false;
  const planeScene = new THREE.Scene();
  planeScene.add(plane);
  const screenRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, type: THREE.HalfFloatType });

  // --- 3. Rays ---
  const coreColor = hexColor(THREE, o.rayColor).lerp(hexColor(THREE, o.tintColor), o.tintMix).multiplyScalar(0.85);
  const rayRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const dye = { value: still as Three.Texture };
  const rayUniforms = {
    uMask: { value: screenRT.texture },
    uDye: dye,
    uCore: { value: new THREE.Vector2(0.5, 0.5) },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAspect: { value: 1 },
    uColor: { value: new THREE.Vector3(coreColor.r, coreColor.g, coreColor.b) },
    uGain: { value: o.gain },
    uDecay: { value: o.decay },
    uLen: { value: o.length },
    uChroma: { value: o.chroma },
    uShimmer: { value: o.shimmer },
    uShimmerT: { value: 0 },
    uDyeBoost: { value: o.fluidRayBoost },
    uFade: { value: 1 },
  };
  const rayMaterial = new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader: RAY_FRAGMENT, uniforms: rayUniforms, depthTest: false, depthWrite: false });
  const rayScene = new THREE.Scene();
  rayScene.add(new THREE.Mesh(quad, rayMaterial));

  // --- 4. Composite (added onto the stage's image) ---
  const compositeMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: COMPOSITE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending,
    uniforms: { uRays: { value: rayRT.texture }, uMask: { value: screenRT.texture }, uDye: dye, uBoost: { value: o.fluidBoost } },
  });
  const compositeScene = new THREE.Scene();
  compositeScene.add(new THREE.Mesh(quad, compositeMaterial));

  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  let clock = 0;
  let enabled = true;

  return {
    anchor,
    logoAspect,
    // Size of the word in world units (cap height); the mask plane covers the whole domain.
    setSize(capHeight: number) {
      const wordW = capHeight * logoAspect;
      anchor.scale.set(wordW, capHeight, 1);
      plane.scale.set(wordW * DOMAIN.x, capHeight * DOMAIN.y, 1);
    },
    resize(width: number, height: number, pixelRatio: number, rayScale: number) {
      const rw = Math.max(1, Math.round(width * pixelRatio * rayScale));
      const rh = Math.max(1, Math.round(height * pixelRatio * rayScale));
      screenRT.setSize(rw, rh);
      rayRT.setSize(rw, rh);
      rayUniforms.uRes.value.set(rw, rh);
      rayUniforms.uAspect.value = width / height;
    },
    setEnabled(on: boolean) {
      enabled = on;
    },
    setDye(tex: Three.Texture) {
      dye.value = tex;
    },
    update(camera: Three.PerspectiveCamera, dt: number) {
      clock += dt;
      maskMaterial.uniforms.uFlow.value += dt * o.flow;
      rayUniforms.uShimmerT.value += dt * o.shimmerSpeed;
      anchor.updateWorldMatrix(true, false);
      plane.position.setFromMatrixPosition(anchor.matrixWorld);
      plane.quaternion.setFromRotationMatrix(anchor.matrixWorld);
      // Fade out as the camera gets close (and when it has passed through).
      v.copy(plane.position).applyMatrix4(camera.matrixWorldInverse);
      rayUniforms.uFade.value = THREE.MathUtils.smoothstep(-v.z, 2, 10);
      // Screen position of the title, and of the light hidden lightDepth behind it.
      v.copy(plane.position).project(camera);
      w.set(0, 0, -o.lightDepth).applyMatrix4(anchor.matrixWorld).project(camera);
      const cx = v.x * 0.5 + 0.5;
      const cy = v.y * 0.5 + 0.5;
      const wobX = ((Math.sin(clock * 0.71) + Math.sin(clock * 1.93 + 1.3) * 0.5) * o.wobble) / 1.5;
      const wobY = ((Math.cos(clock * 0.53) + Math.sin(clock * 1.37 + 2.1) * 0.5) * o.wobble) / 1.5;
      rayUniforms.uCore.value.set(cx + (w.x * 0.5 + 0.5 - cx) * o.lightSwing + wobX / camera.aspect, cy + (w.y * 0.5 + 0.5 - cy) * o.lightSwing + wobY);
    },
    // Adds the title's light onto `target` (which already holds the scene).
    render(renderer: Three.WebGLRenderer, camera: Three.PerspectiveCamera, target: Three.WebGLRenderTarget) {
      if (!enabled || rayUniforms.uFade.value <= 0) return;
      const autoClear = renderer.autoClear;
      renderer.autoClear = true;
      renderer.setRenderTarget(maskRT);
      renderer.render(maskScene, flatCamera);
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(screenRT);
      renderer.render(planeScene, camera);
      renderer.setRenderTarget(rayRT);
      renderer.render(rayScene, flatCamera);
      renderer.autoClear = false;
      renderer.setRenderTarget(target);
      renderer.render(compositeScene, flatCamera);
      renderer.autoClear = autoClear;
    },
    dispose() {
      logoTex.dispose();
      maskRT.dispose();
      screenRT.dispose();
      rayRT.dispose();
      quad.dispose();
      plane.geometry.dispose();
      for (const m of [maskMaterial, planeMaterial, rayMaterial, compositeMaterial]) m.dispose();
    },
  };
}
export type RayTitle = ReturnType<typeof createRayTitle>;
