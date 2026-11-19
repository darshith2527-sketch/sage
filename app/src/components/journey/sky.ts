import type * as Three from "three";
import { GLSL_NOISE, hexColor, type T3 } from "./shared";

// The backdrop: a large sphere seen from inside. A navy gradient, three soft aurora glows at set
// directions (gently warped by noise), a faint horizon line and film grain.

export type SkyOptions = {
  radius?: number;
  top?: string;
  bottom?: string;
  glows?: { color: string; azimuth: number; elevation: number; size: number; intensity: number }[];
  horizonColor?: string;
  horizon?: number;
  warp?: number;
  speed?: number;
  grain?: number;
};

const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlowColor[3];
  uniform vec3 uGlowDir[3];
  uniform vec3 uGlowParams[3]; // size, intensity, unused
  uniform vec3 uHorizonColor;
  uniform float uHorizon;
  uniform float uWarp;
  uniform float uTime;
  uniform float uGrain;
  ${GLSL_NOISE}
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uBottom, uTop, smoothstep(-0.6, 0.8, d.y));
    // Noise bends the glows, so they read as drifting aurora rather than circles.
    vec3 warp = vec3(vnoise3(d * 2.0 + uTime * 0.05), vnoise3(d * 2.0 + 7.1 - uTime * 0.04), vnoise3(d * 2.0 + 3.7 + uTime * 0.03)) - 0.5;
    vec3 wd = normalize(d + warp * uWarp * 0.6);
    for (int i = 0; i < 3; i++) {
      float a = acos(clamp(dot(wd, uGlowDir[i]), -1.0, 1.0));
      col += uGlowColor[i] * exp(-pow(a / max(uGlowParams[i].x, 1e-3), 2.0)) * uGlowParams[i].y * 1.6;
    }
    col += uHorizonColor * exp(-abs(d.y + warp.y * 0.05) / 0.03) * uHorizon * 1.0;
    col += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrain * 4.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky(THREE: T3, options: SkyOptions = {}) {
  const o = {
    radius: 50,
    top: "#0a1a3d",
    bottom: "#030915",
    glows: [
      { color: "#1f5fff", azimuth: 15, elevation: 12, size: 0.6, intensity: 0.07 },
      { color: "#3a4ae8", azimuth: -120, elevation: 20, size: 0.5, intensity: 0.025 },
      { color: "#18b8d0", azimuth: 130, elevation: -4, size: 0.35, intensity: 0.035 },
    ],
    horizonColor: "#3d7dff",
    horizon: 0.025,
    warp: 0.55,
    speed: 0.6,
    grain: 0.006,
    ...options,
  };
  const dir = (az: number, el: number) => {
    const a = (az * Math.PI) / 180;
    const e = (el * Math.PI) / 180;
    // azimuth 0 = straight ahead (-z), positive to the right
    return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
  };
  const color = (c: string) => hexColor(THREE, c);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: color(o.top) },
      uBottom: { value: color(o.bottom) },
      uGlowColor: { value: o.glows.map((g) => color(g.color)) },
      uGlowDir: { value: o.glows.map((g) => dir(g.azimuth, g.elevation)) },
      uGlowParams: { value: o.glows.map((g) => new THREE.Vector3(g.size, g.intensity, 0)) },
      uHorizonColor: { value: color(o.horizonColor) },
      uHorizon: { value: o.horizon },
      uWarp: { value: o.warp },
      uTime: { value: 0 },
      uGrain: { value: o.grain },
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius, 64, 32), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return {
    mesh,
    update(time: number) {
      material.uniforms.uTime.value = time * o.speed;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
export type Sky = ReturnType<typeof createSky>;
export type { Three };
