import type * as Three from "three";
import { createDust, type Dust } from "./dust";
import { createGlassDisc, projectDisc, type GlassDisc } from "./glass";
import { createScales } from "./scales";
import { FONT, font, pick, QUAD_VERTEX, TIERS, wrapText, type FrameInfo, type Hotspot, type Stage, type T3, type Tier } from "./shared";
import { createSky } from "./sky";

// Stage 2: the particle balance scale. Scrolling orbits the camera around it; four round
// frosted-glass discs (Sage's four themes) float on a ring around the scale and fade in as the
// camera comes round to each one. Each disc is a link.

export type Theme = { number: string; title: [string, string]; text: string };

const ORBIT_R = 12.5;
const CAM_Y = 7.4;
const LOOK = { x: 0, y: 6.6, z: 0 };
const RING_R = 6.8;
const DISC_R = 1.75;
const DISC_Y = 7.2;
const LENGTH = 120;
const SWEEP = -Math.PI * 1.75; // radians of orbit over the whole stage
const FEATURED = [0.14, 0.34, 0.54, 0.74]; // where along the stage each disc faces the camera
const LEAD = -0.78; // discs sit a little ahead of the camera's path, so they float beside the scale

const COPY = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  void main() { gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0); }
`;

function drawTheme(theme: Theme) {
  return (ctx: CanvasRenderingContext2D, size: number) => {
    const c = size / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#6bb8ff";
    ctx.font = font(FONT.hud, 34);
    ctx.fillText(theme.number, c, size * 0.27);
    ctx.fillStyle = "#E6F0FF";
    ctx.font = font(FONT.hud, 70);
    ctx.fillText(theme.title[0], c, size * 0.38);
    ctx.fillText(theme.title[1], c, size * 0.47);
    ctx.fillStyle = "#B5CFFF";
    ctx.font = font(FONT.regular, 30);
    wrapText(ctx, theme.text, c, size * 0.57, size * 0.6, 40);
    ctx.fillStyle = "#6bb8ff";
    ctx.font = font(FONT.hud, 30);
    ctx.fillText("OPEN  →", c, size * 0.8);
  };
}

export function createScalesStage(THREE: T3, renderer: Three.WebGLRenderer, env: { still: Three.Texture; tier: Tier; themes: Theme[] }): Stage {
  const camera = new THREE.PerspectiveCamera(80, 1, 0.5, 150);
  const flight = { distance: 0 }; // extra travel along the view during a hand-over
  const world = new THREE.Scene();
  const sky = createSky(THREE, {
    top: "#0b1b44",
    bottom: "#030915",
    glows: [
      { color: "#1f5fff", azimuth: -30, elevation: 18, size: 0.7, intensity: 0.06 },
      { color: "#18b8d0", azimuth: 100, elevation: 0, size: 0.45, intensity: 0.04 },
      { color: "#3a4ae8", azimuth: 200, elevation: 25, size: 0.5, intensity: 0.03 },
    ],
  });
  world.add(sky.mesh);

  let tier = env.tier;
  const scales = createScales(THREE, pick(TIERS.particles, tier));
  world.add(scales.group);

  let dust: Dust[] = [];
  function buildDust() {
    for (const d of dust) {
      world.remove(d.points);
      d.dispose();
    }
    const count = 1e4 * pick(TIERS.particles, tier);
    dust = [
      createDust(THREE, { count: count * 1.5, radius: 34, half: false, center: [0, 0, 0], height: 0.4, flow: 0.06, size: [0.02, 0.05] }, env.still),
      createDust(THREE, { count, radius: 30, half: false, center: [0, 8, 0], height: 22, flow: 0.08, rise: 0.03 }, env.still),
    ];
    for (const d of dust) world.add(d.points);
  }
  buildDust();

  // Glass discs, rendered over a copy of the world image (which they blur).
  const worldRT = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const glassScene = new THREE.Scene();
  const quad = new THREE.PlaneGeometry(2, 2);
  const copy = new THREE.Mesh(
    quad,
    new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader: COPY, uniforms: { uMap: { value: worldRT.texture } }, depthTest: false, depthWrite: false }),
  );
  copy.frustumCulled = false;
  copy.renderOrder = -100;
  glassScene.add(copy);

  const discs: { glass: GlassDisc; angle: number; reveal: number }[] = env.themes.map((theme, i) => {
    const glass = createGlassDisc(THREE, DISC_R, drawTheme(theme));
    const angle = SWEEP * FEATURED[i] + LEAD;
    glass.mesh.position.set(Math.sin(angle) * RING_R, DISC_Y, Math.cos(angle) * RING_R);
    glass.mesh.lookAt(glass.mesh.position.x * 2, DISC_Y, glass.mesh.position.z * 2);
    glassScene.add(glass.mesh);
    return { glass, angle, reveal: 0 };
  });

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let revealClock = 0;
  let orbit = ORBIT_R;
  const toCam = new THREE.Vector3();
  const out = new THREE.Vector3();

  function place(s: number) {
    const phi = SWEEP * (s / LENGTH);
    // A gentle rise and fall as the camera circles.
    const y = CAM_Y + Math.sin((s / LENGTH) * Math.PI * 2) * 0.8;
    camera.position.set(Math.sin(phi) * orbit, y, Math.cos(phi) * orbit);
    camera.lookAt(LOOK.x, LOOK.y, LOOK.z);
    // During a hand-over the engine flies the camera further along its view.
    if (flight.distance) camera.translateZ(-flight.distance);
    camera.updateMatrixWorld();
  }
  place(0);

  const stage: Stage = {
    get fly() {
      return flight.distance;
    },
    set fly(d: number) {
      flight.distance = d;
    },
    name: "scales",
    camera,
    length: LENGTH,
    endZone: 14,
    setScroll(s) {
      place(s);
    },
    resize(w, h, dpr) {
      width = w;
      height = h;
      pixelRatio = dpr;
      camera.aspect = w / h;
      // Portrait screens: pull back so the whole scale (pans included) and the discs still fit.
      orbit = h > w ? ORBIT_R * Math.min(2.1, 1.2 * (h / w)) : ORBIT_R;
      camera.fov = 80;
      camera.updateProjectionMatrix();
      worldRT.setSize(Math.round(w * dpr), Math.round(h * dpr));
    },
    setTier(next) {
      tier = next;
      buildDust();
    },
    update(f: FrameInfo) {
      revealClock += f.dt;
      sky.mesh.position.copy(camera.position); // the sky is "at infinity"
      sky.update(f.time);
      scales.update(f.time, Math.min(1, revealClock / 2.5));
      scales.setScale(height * pixelRatio, camera.fov);
      for (const d of dust) {
        d.update(f.time);
        d.setScale(height * pixelRatio, camera.fov, 2.5);
      }
      for (const d of discs) {
        // Fade a disc in as the camera comes round to face it.
        toCam.copy(camera.position).sub(d.glass.mesh.position).normalize();
        out.set(Math.sin(d.angle), 0, Math.cos(d.angle));
        d.reveal = THREE.MathUtils.smoothstep(toCam.dot(out), 0.35, 0.8) * Math.min(1, revealClock / 1.5);
        d.glass.update(f.dt, d.reveal, worldRT.texture, width * pixelRatio, height * pixelRatio);
      }
    },
    render(r, target) {
      r.setClearColor(0x030915, 1);
      r.setRenderTarget(worldRT);
      r.render(world, camera);
      r.setRenderTarget(target);
      r.render(glassScene, camera);
    },
    hotspots(): Hotspot[] {
      return discs.map((d) => {
        const p = projectDisc(THREE, d.glass.mesh, DISC_R, camera, width, height);
        return { x: p.x, y: p.y, r: p.r, visible: p.inFront && d.reveal > 0.5 };
      });
    },
    setHover(index) {
      discs.forEach((d, i) => d.glass.setHover(i === index));
    },
    scrollFor(i) {
      return FEATURED[i] * LENGTH;
    },
    dispose() {
      sky.dispose();
      scales.dispose();
      for (const d of dust) d.dispose();
      for (const d of discs) d.glass.dispose();
      worldRT.dispose();
      quad.dispose();
      (copy.material as Three.Material).dispose();
    },
  };
  return stage;
}
