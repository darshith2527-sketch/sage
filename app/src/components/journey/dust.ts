import type * as Three from "three";
import { GLSL_NOISE, hexColor, type T3 } from "./shared";

// Drifting dust: particles scattered over a (half) disc, each living 1–2 seconds, fading in
// and out and re-spawning somewhere new. They circle slowly around the centre, wander a little,
// can be kept out of a box (around the title) and are pushed and lit by the pointer's fluid.
// Everything is computed in the vertex shader from per-particle random seeds: no CPU work.

export type DustOptions = {
  count: number;
  radius?: number;
  half?: boolean; // half disc towards the camera (+z), like a stage floor
  y?: number;
  height?: number;
  center?: [number, number, number];
  flow?: number;
  rise?: number;
  size?: [number, number];
  lifetime?: [number, number];
  colors?: string[];
  glow?: number;
  glowSize?: number;
  sparkle?: number; // share of particles that flash
  sparkleStrength?: number;
  sparkleTime?: number;
  sparkleGlow?: number;
  fluidPush?: number;
  fluidGlow?: number;
  obstacle?: { center: [number, number, number]; half: [number, number]; pad: number; depth: number } | null;
};

const VERTEX = /* glsl */ `
  attribute vec4 aSeed;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aLife;
  attribute float aSparkle;
  uniform float uTime;
  uniform float uRadius;
  uniform float uHalf;
  uniform float uY0;
  uniform float uHeight;
  uniform float uFlow;
  uniform float uRise;
  uniform float uSizeScale;
  uniform float uSparkleStrength;
  uniform float uSparkleTime;
  uniform float uSparkleGlow;
  uniform float uGlowSize;
  uniform vec4 uObstacle;      // centre x, y, half width, half height (padding included)
  uniform vec2 uObstacleZ;     // z range of the obstacle
  uniform float uHasObstacle;
  uniform sampler2D uVel;
  uniform sampler2D uDye;
  uniform float uFluidPush;
  uniform float uFluidGlow;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;
  ${GLSL_NOISE}
  void main() {
    float t = uTime / aLife + aSeed.x * 10.0;
    float cycle = floor(t);
    float age = fract(t);
    vec3 r = vec3(hash13(vec3(aSeed.yz * 91.7, cycle)), hash13(vec3(aSeed.zw * 53.3, cycle + 3.1)), hash13(vec3(aSeed.wy * 17.9, cycle + 7.7)));
    float ang = r.x * (uHalf > 0.5 ? 3.14159265 : 6.2831853);
    float rad = sqrt(r.y) * uRadius;
    // Slow circling around the centre, faster towards the rim.
    ang += uFlow * age * aLife * (1.0 + 1.5 * rad / uRadius) / max(rad, 2.0);
    vec3 p = vec3(cos(ang) * rad, uY0 + (r.z - 0.5) * uHeight, sin(ang) * rad);
    // Wander and rise.
    p += (vec3(vnoise3(p * 0.15 + cycle), vnoise3(p * 0.15 + 9.1 + cycle), vnoise3(p * 0.15 + 4.7 + cycle)) - 0.5) * uFlow * 2.0 * age;
    p.y += uRise * age * aLife;
    // Keep the title clear: particles inside its box are moved to its top or bottom edge.
    if (uHasObstacle > 0.5) {
      vec2 d = p.xy - uObstacle.xy;
      if (abs(d.x) < uObstacle.z && abs(d.y) < uObstacle.w && p.z > uObstacleZ.x && p.z < uObstacleZ.y) {
        p.y = uObstacle.y + sign(d.y + 1e-3) * (uObstacle.w + abs(d.y) * 0.35);
      }
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 suv = clamp(clip.xy / max(clip.w, 1e-3) * 0.5 + 0.5, 0.0, 1.0);
    vec2 vel = texture2D(uVel, suv).xy;
    mv.xy += vel * uFluidPush * 0.002 * (-mv.z);
    vec3 dye = texture2D(uDye, suv).rgb;
    float stir = 1.0 - exp(-3.0 * max(dye.r, max(dye.g, dye.b)));
    gl_Position = projectionMatrix * mv;

    float spark = 0.0;
    if (aSparkle > 0.5) spark = pow(max(0.0, sin(uTime * 6.2831853 / uSparkleTime + aSeed.w * 40.0)), 12.0) * uSparkleStrength;
    float depth = -mv.z;
    vAlpha = smoothstep(0.0, 0.3, age) * (1.0 - smoothstep(0.6, 1.0, age)) * smoothstep(4.0, 14.0, depth);
    vColor = aColor * (1.0 + stir * uFluidGlow + spark * uSparkleGlow * 2.0);
    vGlow = spark + stir * 0.5;
    gl_PointSize = max(1.0, aSize * uSizeScale / depth * (1.0 + spark * 2.0 + stir) * mix(1.0, uGlowSize, step(0.001, vGlow) * 0.4));
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uGlow;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = exp(-d * d * 5.0);
    float halo = exp(-d * d * 1.5) * (uGlow + vGlow * 0.6);
    gl_FragColor = vec4(vColor * (core + halo), 1.0) * vAlpha;
  }
`;

export function createDust(THREE: T3, opts: DustOptions, still: Three.Texture) {
  const o = {
    radius: 50,
    half: true,
    y: 0,
    height: 1,
    center: [0, 0, 0] as [number, number, number],
    flow: 0.4,
    rise: 0,
    size: [0.02, 0.06] as [number, number],
    lifetime: [1.2, 2.2] as [number, number],
    colors: ["#5fb0ff", "#3d8bff", "#2b6ef2", "#2156d6", "#173fa8", "#8fcaff"],
    glow: 0,
    glowSize: 1,
    sparkle: 0.015,
    sparkleStrength: 1,
    sparkleTime: 3,
    sparkleGlow: 1.5,
    fluidPush: 0.2,
    fluidGlow: 3,
    obstacle: null,
    ...opts,
  };
  const n = Math.max(1, Math.round(o.count));
  const seed = new Float32Array(n * 4);
  const size = new Float32Array(n);
  const color = new Float32Array(n * 3);
  const life = new Float32Array(n);
  const sparkle = new Float32Array(n);
  const palette = o.colors.map((c) => hexColor(THREE, c));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
    size[i] = o.size[0] + Math.random() * (o.size[1] - o.size[0]);
    const c = palette[Math.floor(Math.random() * palette.length)];
    color.set([c.r, c.g, c.b], i * 3);
    life[i] = o.lifetime[0] + Math.random() * (o.lifetime[1] - o.lifetime[0]);
    sparkle[i] = Math.random() < o.sparkle ? 1 : 0;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  geometry.setAttribute("aLife", new THREE.BufferAttribute(life, 1));
  geometry.setAttribute("aSparkle", new THREE.BufferAttribute(sparkle, 1));
  const ob = o.obstacle;
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: o.radius },
      uHalf: { value: o.half ? 1 : 0 },
      uY0: { value: o.y },
      uHeight: { value: o.height },
      uFlow: { value: o.flow },
      uRise: { value: o.rise },
      uSizeScale: { value: 1000 },
      uSparkleStrength: { value: o.sparkleStrength },
      uSparkleTime: { value: o.sparkleTime },
      uSparkleGlow: { value: o.sparkleGlow },
      uGlow: { value: o.glow },
      uGlowSize: { value: o.glowSize },
      uObstacle: { value: new THREE.Vector4(ob ? ob.center[0] : 0, ob ? ob.center[1] : 0, ob ? ob.half[0] + ob.pad : 0, ob ? ob.half[1] + ob.pad : 0) },
      uObstacleZ: { value: new THREE.Vector2(ob ? ob.center[2] - 2 : 0, ob ? ob.center[2] + ob.depth : 0) },
      uHasObstacle: { value: ob ? 1 : 0 },
      uVel: { value: still },
      uDye: { value: still },
      uFluidPush: { value: o.fluidPush },
      uFluidGlow: { value: o.fluidGlow },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.position.set(...o.center);
  points.frustumCulled = false;
  return {
    points,
    material,
    // Pixel size of one world unit at distance 1, for the current camera and canvas.
    setScale(heightPx: number, fovDeg: number, sizeBoost = 1.4) {
      material.uniforms.uSizeScale.value = (heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360))) * sizeBoost;
    },
    setFluid(vel: Three.Texture, dye: Three.Texture) {
      material.uniforms.uVel.value = vel;
      material.uniforms.uDye.value = dye;
    },
    update(time: number) {
      material.uniforms.uTime.value = time;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
export type Dust = ReturnType<typeof createDust>;
