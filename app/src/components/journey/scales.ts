import type * as Three from "three";
import { GLSL_NOISE, hexColor, type T3 } from "./shared";

// A balance scale built from glowing points, standing in for the reference's particle bust.
// Real 3D geometry, sampled as points with a surface direction each, so it can be lit:
// a key light from the upper left and a strong rim light around the silhouette. The beam
// sways gently and the pans hang level from their chains as it tips.
//
// Units: the whole scale is about 12 tall, centred on the origin's x/z, base at y = 0.

type Pts = { p: number[]; n: number[] };
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function push(out: Pts, x: number, y: number, z: number, nx: number, ny: number, nz: number) {
  out.p.push(x, y, z);
  const l = Math.hypot(nx, ny, nz) || 1;
  out.n.push(nx / l, ny / l, nz / l);
}

// A solid disc: top face plus its rim.
function disc(out: Pts, n: number, radius: number, y: number, height: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    if (Math.random() < 0.55) {
      const r = radius * Math.sqrt(Math.random());
      push(out, Math.cos(a) * r, y + height, Math.sin(a) * r, 0, 1, 0);
    } else push(out, Math.cos(a) * radius, y + Math.random() * height, Math.sin(a) * radius, Math.cos(a), 0, Math.sin(a));
  }
}
// A column that narrows towards the top, with a fluted profile.
function column(out: Pts, n: number, r0: number, r1: number, y0: number, y1: number) {
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    const a = Math.random() * Math.PI * 2;
    const r = (r0 + (r1 - r0) * t) * (1 + 0.06 * Math.cos(a * 12));
    push(out, Math.cos(a) * r, y0 + (y1 - y0) * t, Math.sin(a) * r, Math.cos(a), (r0 - r1) / (y1 - y0), Math.sin(a));
  }
}
function ball(out: Pts, n: number, radius: number, cx: number, cy: number, squash = 1) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    push(out, cx + radius * s * Math.cos(a), cy + radius * u * squash, radius * s * Math.sin(a), s * Math.cos(a), u, s * Math.sin(a));
  }
}
// A horizontal beam along x, thicker in the middle, with rounded ends.
function beam(out: Pts, n: number, half: number) {
  for (let i = 0; i < n; i++) {
    const x = rand(-half, half);
    const r = 0.16 * (1 - 0.45 * Math.abs(x / half)) + 0.05;
    const a = Math.random() * Math.PI * 2;
    push(out, x, Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a), Math.sin(a));
  }
  for (const end of [-half, half]) ball(out, n * 0.04, 0.22, end, 0);
}
// One hanging pan: three chains from the hook meeting a shallow bowl. Origin = the hook.
function pan(out: Pts, chain: number, bowl: number, drop: number, radius: number) {
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2 + Math.PI / 6;
    const ex = Math.cos(a) * radius;
    const ez = Math.sin(a) * radius;
    for (let i = 0; i < chain / 3; i++) {
      const t = Math.random();
      push(out, ex * t + rand(-0.02, 0.02), -drop * t, ez * t + rand(-0.02, 0.02), Math.cos(a), 0.3, Math.sin(a));
    }
  }
  for (let i = 0; i < bowl; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random());
    const r = radius * rr;
    const depth = 0.75 * (1 - rr * rr);
    push(out, Math.cos(a) * r, -drop - depth, Math.sin(a) * r, Math.cos(a) * rr, -1 + rr * 0.6, Math.sin(a) * rr);
  }
  for (let i = 0; i < bowl * 0.3; i++) {
    const a = Math.random() * Math.PI * 2;
    push(out, Math.cos(a) * radius, -drop + rand(-0.04, 0.04), Math.sin(a) * radius, Math.cos(a), 0.2, Math.sin(a));
  }
}

const VERTEX = /* glsl */ `
  attribute vec3 aNormal;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSizeScale;
  uniform float uSize;
  uniform float uReveal;
  uniform vec3 uKey;
  varying float vLight;
  varying float vRim;
  varying float vSeed;
  varying float vAlpha;
  ${GLSL_NOISE}
  void main() {
    vec3 p = position;
    // Living surface: points drift a little around their place.
    float t = uTime * 0.18;
    p += (vec3(vnoise3(p * 1.3 + t), vnoise3(p * 1.3 + 11.0 - t), vnoise3(p * 1.3 + 5.0 + t)) - 0.5) * 0.015;
    // Reveal: points gather in from a scattered cloud.
    vec3 scatter = p + (vec3(hash12(vec2(aSeed, 1.0)), hash12(vec2(aSeed, 2.0)), hash12(vec2(aSeed, 3.0))) - 0.5) * 18.0;
    float k = smoothstep(aSeed * 0.4, aSeed * 0.4 + 0.6, uReveal);
    p = mix(scatter, p, k);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * aNormal);
    vec3 view = normalize(cameraPosition - world.xyz);
    vLight = max(dot(n, normalize(uKey)), 0.0);
    vRim = pow(1.0 - abs(dot(n, view)), 2.2);
    vSeed = aSeed;
    vAlpha = k;
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, uSize * (0.6 + aSeed * 0.8) * uSizeScale / -mv.z);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uBright;
  uniform float uTime;
  varying float vLight;
  varying float vRim;
  varying float vSeed;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float shade = pow(vLight, 1.6) * 0.8 + vRim * 1.3;
    vec3 col = mix(uDeep, uMid, clamp(shade, 0.0, 1.0));
    col = mix(col, uBright, smoothstep(0.75, 1.6, shade));
    float twinkle = 0.9 + 0.1 * sin(uTime * (0.5 + vSeed) + vSeed * 50.0);
    float a = exp(-d * d * 4.0) * (0.35 + shade * 0.9) * twinkle * vAlpha;
    gl_FragColor = vec4(col * a, 1.0);
  }
`;

export function createScales(THREE: T3, density: number) {
  const n = (k: number) => Math.max(30, Math.round(k * density));
  const group = new THREE.Group();
  const beamPivot = new THREE.Group();
  const hooks = [new THREE.Group(), new THREE.Group()];
  const PIVOT_Y = 10.2;
  const HALF = 4.6;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSizeScale: { value: 1000 },
      uSize: { value: 0.07 },
      uReveal: { value: 0 },
      uKey: { value: new THREE.Vector3(-0.6, 0.7, 0.5) },
      uDeep: { value: hexColor(THREE, "#0d2a7a") },
      uMid: { value: hexColor(THREE, "#2b6ef2") },
      uBright: { value: hexColor(THREE, "#bfe4ff") },
    },
  });
  const geometries: Three.BufferGeometry[] = [];
  function points(pts: Pts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts.p, 3));
    g.setAttribute("aNormal", new THREE.Float32BufferAttribute(pts.n, 3));
    const seed = new Float32Array(pts.p.length / 3).map(() => Math.random());
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geometries.push(g);
    const m = new THREE.Points(g, material);
    m.frustumCulled = false;
    return m;
  }

  const body: Pts = { p: [], n: [] };
  disc(body, n(9000), 3.2, 0, 0.35); // plinth
  disc(body, n(6000), 2.4, 0.35, 0.35);
  disc(body, n(3000), 1.5, 0.7, 0.25);
  column(body, n(12000), 0.42, 0.26, 0.95, PIVOT_Y - 0.3);
  ball(body, n(1500), 0.42, 0, PIVOT_Y, 0.8); // pivot
  ball(body, n(2500), 0.55, 0, PIVOT_Y + 1.1); // finial
  column(body, n(800), 0.12, 0.1, PIVOT_Y, PIVOT_Y + 0.6);
  group.add(points(body));

  const beamPts: Pts = { p: [], n: [] };
  beam(beamPts, n(9000), HALF);
  beamPivot.add(points(beamPts));
  beamPivot.position.y = PIVOT_Y;
  group.add(beamPivot);

  for (const [i, hook] of hooks.entries()) {
    const panPts: Pts = { p: [], n: [] };
    pan(panPts, n(3000), n(9000), 5.2, 2.1);
    hook.add(points(panPts));
    hook.userData.side = i === 0 ? -1 : 1;
    group.add(hook);
  }

  const end = new THREE.Vector3();
  return {
    group,
    height: PIVOT_Y + 1.7,
    setScale(heightPx: number, fovDeg: number) {
      material.uniforms.uSizeScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    },
    update(time: number, reveal: number) {
      material.uniforms.uTime.value = time;
      material.uniforms.uReveal.value = reveal;
      // The beam sways; each pan hangs straight down from its end of the beam.
      const tilt = Math.sin(time * 0.45) * 0.07 + Math.sin(time * 0.17) * 0.03;
      beamPivot.rotation.z = tilt;
      for (const hook of hooks) {
        end.set(hook.userData.side * HALF, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt);
        hook.position.set(end.x, PIVOT_Y + end.y, 0);
        hook.rotation.y = time * 0.05 * hook.userData.side;
      }
    },
    dispose() {
      for (const g of geometries) g.dispose();
      material.dispose();
    },
  };
}
export type Scales = ReturnType<typeof createScales>;
export type { Three };
