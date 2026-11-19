import type * as Three from "three";
import { hexColor, type T3 } from "./shared";

// A round pane of frosted glass floating in the scene. It shows a blurred copy of whatever is
// behind it (the stage renders the world first and hands that image over), tinted navy, with an
// inner glow, a thin bright rim, a soft sheen and its label on top. Hover brightens the frost
// and rim and adds an outer glow; `reveal` fades it in.

const OUTER = 1.25; // the quad extends past the disc for the outer glow

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uLabel;
  uniform vec2 uRes;
  uniform float uReveal;
  uniform float uHover;
  uniform vec3 uFill;
  uniform vec3 uBorder;
  uniform vec3 uGlow;
  uniform float uOuter;
  void main() {
    float r = length(vUv - 0.5) * 2.0 * uOuter;   // 1.0 at the disc's edge
    float inside = 1.0 - smoothstep(0.992, 1.0, r);
    vec2 suv = gl_FragCoord.xy / uRes;
    vec3 frost = texture2D(uScene, suv, 4.5).rgb * (0.6 + uHover * 1.1);
    vec3 col = frost * 0.75 + uFill * 0.22;
    col += uGlow * smoothstep(0.7, 1.0, r) * (0.18 + 0.4 * uHover);                 // inner glow
    col += uBorder * smoothstep(0.955, 0.975, r) * (1.0 - smoothstep(0.985, 1.0, r)) * (0.9 + 0.8 * uHover); // rim
    col += vec3(0.8, 0.9, 1.0) * smoothstep(0.35, -0.7, dot(vUv - 0.5, vec2(0.7, -0.7)) * 2.0) * 0.05;  // sheen
    vec4 label = texture2D(uLabel, (vUv - 0.5) * uOuter + 0.5);
    col = mix(col, label.rgb, label.a);
    float outer = (1.0 - inside) * exp(-(r - 1.0) * 10.0) * (0.08 + 0.3 * uHover);
    float a = inside * uReveal;
    gl_FragColor = vec4(col * a + uGlow * outer * uReveal, a);
  }
`;

export type GlassDisc = ReturnType<typeof createGlassDisc>;

export function createGlassDisc(THREE: T3, radius: number, drawLabel: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const size = 768;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  drawLabel(ctx, size);
  const label = new THREE.CanvasTexture(canvas);
  label.colorSpace = THREE.NoColorSpace;
  label.anisotropy = 4;
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uScene: { value: null as Three.Texture | null },
      uLabel: { value: label },
      uRes: { value: new THREE.Vector2(1, 1) },
      uReveal: { value: 0 },
      uHover: { value: 0 },
      uFill: { value: hexColor(THREE, "#2d5399") },
      uBorder: { value: hexColor(THREE, "#6bb0f9") },
      uGlow: { value: hexColor(THREE, "#2c79ff") },
      uOuter: { value: OUTER },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2 * OUTER, radius * 2 * OUTER), material);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  let hover = 0;
  let hoverTarget = 0;
  return {
    mesh,
    radius,
    setHover(on: boolean) {
      hoverTarget = on ? 1 : 0;
    },
    update(dt: number, reveal: number, scene: Three.Texture, resX: number, resY: number) {
      // Hover eases in over ~0.45 s and out over ~0.35 s, like the reference buttons.
      hover += (hoverTarget - hover) * (1 - Math.exp(-dt * (hoverTarget > hover ? 6.5 : 8.5)));
      const u = material.uniforms;
      u.uHover.value = hover;
      u.uReveal.value = reveal;
      u.uScene.value = scene;
      u.uRes.value.set(resX, resY);
      mesh.scale.setScalar(1 + hover * 0.04);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      label.dispose();
    },
  };
}

// Projects a disc to the screen: centre (CSS px, y up) and radius, for the DOM link over it.
export function projectDisc(THREE: T3, mesh: Three.Mesh, radius: number, camera: Three.Camera, width: number, height: number) {
  const c = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(radius * mesh.scale.x);
  const edge = c.clone().add(right).project(camera);
  const view = c.clone().applyMatrix4(camera.matrixWorldInverse);
  c.project(camera);
  const x = (c.x * 0.5 + 0.5) * width;
  const y = (c.y * 0.5 + 0.5) * height;
  const r = Math.hypot((edge.x - c.x) * 0.5 * width, (edge.y - c.y) * 0.5 * height);
  return { x, y, r, inFront: view.z < -0.5 };
}
