import type * as Three from "three";
import { HeroFluid } from "./fluid";
import { detectTier, pick, QUAD_VERTEX, TIERS, type FrameInfo, type Stage, type T3, type Tier } from "./shared";

// Runs the home page journey: one WebGL canvas, a list of stages (scenes), a virtual scroll
// (wheel, touch, keys) that moves the camera through the current stage, and a cinematic
// hand-over to the next stage near its end. Clickable 3D objects get invisible real links laid
// over them, so hover, click, keyboard focus and screen readers all work natively.

// Hand-over between stages: no visible effect, just a flight. The camera keeps going and
// speeds up into the dark; the next scene comes towards you from far ahead and you glide into
// it. The two images blend softly in the middle, while both are mostly dark space.
const FLIGHT = { duration: 2.6, out: 46, in: 52 };
const ease = (t: number) => t * t * (3 - 2 * t);

const BLEND_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform float uMix;
  void main() {
    gl_FragColor = vec4(mix(texture2D(uFrom, vUv).rgb, texture2D(uTo, vUv).rgb, uMix), 1.0);
  }
`;

const COPY_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  void main() { gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0); }
`;

export type JourneyOptions = {
  section: HTMLElement; // receives input; sized to the viewport
  mount: HTMLElement; // where the canvas goes
  makeStages: (THREE: T3, renderer: Three.WebGLRenderer, env: { still: Three.Texture; tier: Tier; canFluid: boolean }) => Stage[];
  hotspotLinks: Record<string, HTMLElement[]>; // per stage name, one element per hotspot
  onStage?: (name: string, index: number) => void;
  onProgress?: (stage: string, progress: number) => void; // 0..1 through the current stage
};

export type JourneyHandle = {
  goTo(stageIndex: number): void; // animated hand-over to a stage
  focusHotspot(stage: string, index: number): void;
  dispose(): void;
};

export function startJourney(THREE: T3, o: JourneyOptions): JourneyHandle | null {
  let renderer: Three.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const detected = detectTier(renderer);
  let tier = detected.tier;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, pick(TIERS.pixelRatio, tier));
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // shaders already output display values
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  o.mount.appendChild(canvas);

  const still = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  still.needsUpdate = true;
  const stages = o.makeStages(THREE, renderer, { still, tier, canFluid: HeroFluid.supported(renderer) && !reduceMotion });

  // --- Screen targets and the final pass ---
  const makeRT = () => new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, type: THREE.HalfFloatType });
  const rtA = makeRT();
  const rtB = makeRT();
  const quad = new THREE.PlaneGeometry(2, 2);
  const flat = new THREE.Camera();
  const copyMaterial = new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader: COPY_FRAGMENT, uniforms: { uMap: { value: rtA.texture } }, depthTest: false, depthWrite: false });
  const transitionMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: BLEND_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: { uFrom: { value: rtA.texture }, uTo: { value: rtB.texture }, uMix: { value: 0 } },
  });
  const presentMesh = new THREE.Mesh(quad, copyMaterial);
  const presentScene = new THREE.Scene();
  presentScene.add(presentMesh);

  // --- State ---
  let width = 1;
  let height = 1;
  let current = 0;
  const scroll = stages.map(() => ({ target: 0, value: 0 }));
  let transition: { from: number; to: number; t: number } | null = null;
  const pointer = { x: 0.5, y: 0.5, inside: false, has: false };
  let hover: number | null = null;

  function layout() {
    const rect = o.section.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    rtA.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    rtB.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    for (const s of stages) s.resize(width, height, pixelRatio);
  }

  function applyTier(next: Tier) {
    tier = next;
    pixelRatio = Math.min(window.devicePixelRatio || 1, pick(TIERS.pixelRatio, tier));
    renderer.setPixelRatio(pixelRatio);
    o.section.dataset.tier = String(tier);
    for (const s of stages) s.setTier?.(tier);
    layout();
  }

  // --- Moving through stages ---
  function startTransition(to: number) {
    if (transition || to === current || to < 0 || to >= stages.length) return;
    transition = { from: current, to, t: 0 };
    const landing = to > current ? 0 : Math.max(0, stages[to].length - stages[to].endZone - 2);
    scroll[to].target = scroll[to].value = landing;
    stages[to].setScroll(landing);
    o.onStage?.(stages[to].name, to);
    o.section.dataset.stage = stages[to].name;
  }

  function nudge(amount: number) {
    if (transition) return;
    const st = stages[current];
    const sc = scroll[current];
    sc.target += amount;
    if (sc.target < 0) {
      sc.target = 0;
      if (amount < 0 && sc.value < 0.5 && current > 0) startTransition(current - 1);
    }
    const end = st.length;
    if (sc.target > end) sc.target = end;
    if (st.endZone > 0 && sc.target > end - st.endZone && current < stages.length - 1) startTransition(current + 1);
  }

  // --- Input ---
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * height : e.deltaY;
    nudge(Math.max(-320, Math.min(320, dy)) * 0.024); // ≈ the reference: six 300px ticks cross the title
  }
  let touchY: number | null = null;
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== "mouse") touchY = e.clientY;
  }
  function onPointerMove(e: PointerEvent) {
    const rect = o.section.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (inside && pointer.has) stages[current].splat?.(x, y, x - pointer.x, y - pointer.y);
    pointer.x = x;
    pointer.y = y;
    pointer.inside = inside;
    pointer.has = inside;
    if (touchY !== null) {
      nudge((touchY - e.clientY) * 0.06);
      touchY = e.clientY;
    }
  }
  function onPointerUp() {
    touchY = null;
  }
  function onPointerLeave() {
    pointer.inside = false;
    pointer.has = false;
  }
  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const step = stages[current].length / 8;
    if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement))) {
      nudge(step);
      e.preventDefault();
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      nudge(-step);
      e.preventDefault();
    }
  }

  // --- Clickable 3D objects: real links that follow them on screen ---
  function placeHotspots() {
    for (const [name, links] of Object.entries(o.hotspotLinks)) {
      const index = stages.findIndex((s) => s.name === name);
      const active = index === current && !transition;
      const spots = active ? (stages[index].hotspots?.() ?? []) : [];
      links.forEach((el, i) => {
        const s = spots[i];
        if (!s || !s.visible) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          return;
        }
        el.style.visibility = "visible";
        el.style.pointerEvents = "auto";
        el.style.width = el.style.height = `${s.r * 2}px`;
        el.style.transform = `translate(${s.x - s.r}px, ${height - s.y - s.r}px)`;
      });
    }
  }
  const hoverHandlers: [HTMLElement, () => void, () => void][] = [];
  for (const [name, links] of Object.entries(o.hotspotLinks)) {
    links.forEach((el, i) => {
      const enter = () => {
        const index = stages.findIndex((s) => s.name === name);
        if (index === current) {
          hover = i;
          stages[index].setHover?.(i);
        }
      };
      const leave = () => {
        if (hover === i) {
          hover = null;
          stages[current].setHover?.(null);
        }
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focus", enter);
      el.addEventListener("blur", leave);
      hoverHandlers.push([el, enter, leave]);
    });
  }

  // --- Slow-frame watchdog (GPU-timed where possible; see the notes on 30 fps caps) ---
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const timer = renderer.capabilities.isWebGL2 ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
  let query: WebGLQuery | null = null;
  const start = performance.now();
  const perf = { since: start + 3000, frames: 0, total: 0, gpu: [] as number[], downgrades: 0 };
  function pollGpu() {
    if (!timer || !query || !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return;
    if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) perf.gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
    gl.deleteQuery(query);
    query = null;
  }
  function watch(now: number, dtMs: number) {
    if (now < perf.since) return;
    perf.frames++;
    perf.total += dtMs;
    if (now - perf.since < 2000) return;
    const sorted = [...perf.gpu].sort((a, b) => a - b);
    const gpuMs = sorted.length >= 5 ? sorted[Math.floor(sorted.length / 2)] : null;
    const slow = gpuMs !== null ? gpuMs > 14 : perf.total / perf.frames > 40;
    if (gpuMs !== null) o.section.dataset.gpuMs = gpuMs.toFixed(1);
    perf.since = now;
    perf.frames = 0;
    perf.total = 0;
    perf.gpu = [];
    if (slow && detected.reason !== "forced" && perf.downgrades < 2 && tier < 4) {
      perf.downgrades++;
      applyTier((tier + 1) as Tier);
    }
  }

  // --- Frame loop ---
  let frame = 0;
  let running = false;
  let visible = true;
  let last = performance.now();
  let clock = 0;

  function frameInfo(dt: number): FrameInfo {
    return { time: clock, dt, pointer, width, height, pixelRatio };
  }

  function tick(now: number) {
    const dtMs = now - last;
    const dt = Math.min(0.05, dtMs / 1000);
    last = now;
    watch(now, dtMs);
    if (!reduceMotion) clock += dt;
    pollGpu();
    const timing = timer !== null && query === null;
    if (timing) {
      query = gl.createQuery();
      gl.beginQuery(timer.TIME_ELAPSED_EXT, query!);
    }

    const f = frameInfo(dt);
    const damp = 1 - Math.exp(-dt * (reduceMotion ? 30 : 9));
    if (transition && !reduceMotion) {
      // Forward: the old scene speeds away behind you, the new one glides in from ahead.
      // Backward: the same flight in reverse.
      const t = Math.min(1, transition.t);
      const dir = transition.to > transition.from ? 1 : -1;
      stages[transition.from].fly = dir * FLIGHT.out * t * t * t;
      stages[transition.to].fly = -dir * FLIGHT.in * Math.pow(1 - t, 3);
    }
    const active = transition ? [transition.from, transition.to] : [current];
    for (const i of active) {
      const sc = scroll[i];
      sc.value += (sc.target - sc.value) * damp;
      stages[i].setScroll(sc.value);
      stages[i].update(f);
    }
    const st = stages[current];
    o.onProgress?.(st.name, st.length > 0 ? scroll[current].value / st.length : 0);

    if (transition) {
      transition.t += dt / (reduceMotion ? 0.35 : FLIGHT.duration);
      stages[transition.from].render(renderer, rtA);
      stages[transition.to].render(renderer, rtB);
      presentMesh.material = transitionMaterial;
      transitionMaterial.uniforms.uMix.value = ease(Math.min(1, Math.max(0, (transition.t - 0.3) / 0.45)));
      if (transition.t >= 1) {
        stages[transition.from].fly = 0;
        stages[transition.to].fly = 0;
        current = transition.to;
        transition = null;
        hover = null;
      }
    } else {
      st.render(renderer, rtA);
      presentMesh.material = copyMaterial;
    }
    renderer.setRenderTarget(null);
    renderer.render(presentScene, flat);
    placeHotspots();
    if (timing) gl.endQuery(timer!.TIME_ELAPSED_EXT);
  }

  function loop(now: number) {
    tick(now);
    frame = requestAnimationFrame(loop);
  }
  function play() {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    perf.since = last + 1000;
    perf.frames = 0;
    perf.total = 0;
    frame = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }
  function onVisibility() {
    if (document.hidden) pause();
    else play();
  }

  const resizeObserver = new ResizeObserver(layout);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) play();
    else pause();
  });
  layout();
  o.section.dataset.webgl = "on";
  o.section.dataset.tier = String(tier);
  o.section.dataset.stage = stages[0].name;
  o.onStage?.(stages[0].name, 0);
  resizeObserver.observe(o.section);
  io.observe(o.section);
  o.section.addEventListener("wheel", onWheel, { passive: false });
  o.section.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVisibility);
  play();

  return {
    goTo(i) {
      startTransition(i);
    },
    focusHotspot(name, i) {
      const index = stages.findIndex((s) => s.name === name);
      const target = stages[index]?.scrollFor?.(i);
      if (index === current && target !== undefined) scroll[index].target = target;
    },
    dispose() {
      pause();
      resizeObserver.disconnect();
      io.disconnect();
      o.section.removeEventListener("wheel", onWheel);
      o.section.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const [el, enter, leave] of hoverHandlers) {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
        el.removeEventListener("focus", enter);
        el.removeEventListener("blur", leave);
      }
      if (query) gl.deleteQuery(query);
      for (const s of stages) s.dispose();
      rtA.dispose();
      rtB.dispose();
      quad.dispose();
      copyMaterial.dispose();
      transitionMaterial.dispose();
      still.dispose();
      delete o.section.dataset.webgl;
      renderer.dispose();
      canvas.remove();
    },
  };
}
