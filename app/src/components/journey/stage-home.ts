import type * as Three from "three";
import { createDust, type Dust } from "./dust";
import { HeroFluid } from "./fluid";
import { createRayTitle } from "./ray-title";
import { FONT, pick, TIERS, type FrameInfo, type Stage, type T3, type Tier } from "./shared";
import { createSky } from "./sky";
import { createTextPlane } from "./text-plane";

// Stage 1, the opening screen: SAGE as light rays in deep navy space, three fields of drifting
// dust, a faint subtitle. Scrolling moves the camera straight forward, through the title;
// the pointer turns the camera slightly (parallax) and stirs a fluid that lights things up.

const TITLE_Z = -30;
const START_Z = 24;
const TRAVEL = 56;
const MAX_YAW = 0.15; // radians
const ORBIT = 10; // the camera turns around a point this far ahead

export function createHomeStage(THREE: T3, renderer: Three.WebGLRenderer, env: { still: Three.Texture; tier: Tier; canFluid: boolean; subtitle: string }): Stage {
  const camera = new THREE.PerspectiveCamera(80, 1, 1, 120);
  const scene = new THREE.Scene();
  const sky = createSky(THREE);
  scene.add(sky.mesh);

  const title = createRayTitle(THREE, { text: "SAGE" }, env.still);
  title.anchor.position.set(0, 0, TITLE_Z);
  scene.add(title.anchor);

  const subtitle = createTextPlane(THREE, { text: env.subtitle, face: FONT.medium, height: 1.05, color: "#2d5399", opacity: 0.2 });
  subtitle.mesh.position.set(0, -8, TITLE_Z);
  scene.add(subtitle.mesh);

  let tier = env.tier;
  let dust: Dust[] = [];
  function buildDust(capHalf: [number, number]) {
    for (const d of dust) {
      scene.remove(d.points);
      d.dispose();
    }
    const count = 1e4 * pick(TIERS.particles, tier);
    dust = [
      createDust(THREE, { count, center: [0, -10, TITLE_Z], glow: 0.01, glowSize: 5 }, env.still),
      createDust(THREE, { count, center: [0, 15, TITLE_Z] }, env.still),
      createDust(THREE, { count, center: [0, 0, TITLE_Z], height: 30, obstacle: { center: [0, 0, 0], half: capHalf, pad: 2, depth: 30 } }, env.still),
    ];
    for (const d of dust) scene.add(d.points);
  }

  let fluid: HeroFluid | null = null;
  function setupFluid() {
    const res = pick(TIERS.fluidRes, tier);
    const want = env.canFluid && res > 0;
    if (want && !fluid) fluid = new HeroFluid(THREE, renderer, { simRes: res, dyeRes: res * 2, radius: 0.002 });
    if (!want && fluid) {
      fluid.dispose();
      fluid = null;
    }
  }
  setupFluid();

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let startZ = START_Z;
  let scroll = 0;
  let yaw = 0;
  let portrait = false;

  function place() {
    const z = startZ - scroll;
    const pivotZ = z - ORBIT;
    camera.position.set(Math.sin(yaw) * ORBIT, 0, pivotZ + Math.cos(yaw) * ORBIT);
    camera.lookAt(0, 0, pivotZ);
    camera.updateMatrixWorld();
  }

  return {
    name: "home",
    camera,
    get length() {
      return TRAVEL - (portrait ? 4 : 0);
    },
    endZone: 14,
    setScroll(s) {
      scroll = s;
      place();
    },
    resize(w, h, dpr) {
      width = w;
      height = h;
      pixelRatio = dpr;
      portrait = h > w;
      startZ = START_Z - (portrait ? 4 : 0);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Title size: capitals 14% of the screen height (as in the reference); on portrait
      // screens limited by width instead, so the word keeps the same proportions.
      const dist = startZ - TITLE_Z;
      const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
      const visW = visH * camera.aspect;
      const cap = Math.min(0.14 * visH, 0.144 * visW);
      title.setSize(cap);
      title.resize(w, h, dpr, pick(TIERS.rayScale, tier));
      subtitle.mesh.scale.setScalar(portrait ? 0.75 : 1);
      buildDust([(cap * title.logoAspect) / 2, cap / 2]);
      fluid?.resize(w, h);
      place();
    },
    setTier(next) {
      tier = next;
      setupFluid();
      title.setEnabled(pick(TIERS.rays, tier));
      this.resize(width, height, pixelRatio);
    },
    splat(x, y, dx, dy) {
      fluid?.splat(x, y, dx, dy);
    },
    update(f: FrameInfo) {
      // Parallax: the camera turns slightly towards the pointer.
      const target = f.pointer.inside ? -(f.pointer.x - 0.5) * 2 * MAX_YAW : 0;
      yaw += (target - yaw) * (1 - Math.exp(-f.dt * 5));
      place();
      sky.update(f.time);
      if (fluid) {
        fluid.step(f.dt);
        title.setDye(fluid.dye.read.texture);
      }
      for (const d of dust) {
        d.update(f.time);
        d.setScale(height * pixelRatio, camera.fov);
        if (fluid) d.setFluid(fluid.velocity.read.texture, fluid.dye.read.texture);
      }
      title.update(camera, f.dt);
    },
    render(r, target) {
      r.setClearColor(0x030915, 1);
      r.setRenderTarget(target);
      r.render(scene, camera);
      title.render(r, camera, target);
    },
    dispose() {
      sky.dispose();
      title.dispose();
      subtitle.dispose();
      for (const d of dust) d.dispose();
      fluid?.dispose();
    },
  };
}
