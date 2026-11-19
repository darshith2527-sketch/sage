import { GLSL_NOISE, hexColor, type T3 } from "./shared";

// A column of light: thousands of thin lines pour straight down from above, bend at the floor
// and spread out across it towards the viewer. The lines themselves glow faintly; brighter
// pulses of light travel along them. Each line is a fixed curve computed in the vertex shader.

const VERTEX = /* glsl */ `
  attribute vec4 aStrand;   // angle, phase, jitter, bend
  attribute float aS;       // position along the line: 0 = top … 1 = far end on the floor
  uniform float uTime;
  uniform float uSpeed;
  uniform float uTop;
  uniform float uSpread;
  uniform float uColumn;
  uniform float uBase;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  ${GLSL_NOISE}
  void main() {
    float s = aS;
    float fall = 0.42;
    float a = aStrand.x + (aStrand.w - 0.5) * 0.8 * smoothstep(fall, 1.0, s);
    float rc = uColumn * (0.45 + 0.55 * aStrand.z);
    // Falling part: straight down; it bends smoothly into the floor around s = fall.
    float y = max(uTop * (1.0 - s / fall), 0.0);
    float u = max(0.0, (s - fall * 0.88) / (1.0 - fall * 0.88));
    y += 1.4 * (1.0 - smoothstep(0.0, 0.12, u)) * smoothstep(fall * 0.8, fall, s);
    float r = rc * (1.0 + 0.6 * smoothstep(0.2, fall, s)) + pow(u, 1.25) * uSpread * (0.7 + 0.3 * aStrand.z);
    vec3 p = vec3(cos(a) * r, y, sin(a) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Light travelling down the lines: a faint base glow plus moving pulses.
    float pulse = pow(max(0.0, sin((s * 7.0 - uTime * uSpeed * (0.8 + 0.4 * aStrand.z)) * 6.2831853 + aStrand.y * 40.0)), 24.0);
    float fadeTop = smoothstep(0.0, 0.08, s);
    float fadeFar = 1.0 - smoothstep(0.7, 1.0, s);
    vAlpha = (uBase + pulse * 0.45) * fadeTop * fadeFar;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.5, s));
    vColor = mix(col, uColorC, smoothstep(0.5, 0.95, s)) * (0.7 + 0.6 * hash12(aStrand.xy));
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, 1.0);
  }
`;

export function createFibers(THREE: T3, { strands, segments }: { strands: number; segments: number }) {
  const verts = strands * segments * 2;
  const strand = new Float32Array(verts * 4);
  const sAttr = new Float32Array(verts);
  let v = 0;
  for (let i = 0; i < strands; i++) {
    // Mostly fanning out towards the viewer (+z), some to the sides and behind.
    const a = Math.random() < 0.8 ? -0.15 * Math.PI + Math.random() * 1.3 * Math.PI : Math.random() * Math.PI * 2;
    const params = [a, Math.random(), Math.random(), Math.random()];
    for (let j = 0; j < segments; j++) {
      for (const k of [j, j + 1]) {
        strand.set(params, v * 4);
        sAttr[v] = k / segments;
        v++;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  geometry.setAttribute("aStrand", new THREE.BufferAttribute(strand, 4));
  geometry.setAttribute("aS", new THREE.BufferAttribute(sAttr, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0.18 },
      uTop: { value: 46 },
      uSpread: { value: 40 },
      uColumn: { value: 2.6 },
      uBase: { value: 0.03 },
      uColorA: { value: hexColor(THREE, "#9fd4ff") },
      uColorB: { value: hexColor(THREE, "#4aa3ff") },
      uColorC: { value: hexColor(THREE, "#2468e8") },
    },
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return {
    points: lines,
    setScale() {
      // Lines are one pixel wide; nothing to scale.
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
