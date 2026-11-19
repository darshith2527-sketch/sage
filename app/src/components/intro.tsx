"use client";

import "@fontsource/sedgwick-ave-display";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The opening screen: "SAGE" in brush lettering made of glowing particles, and a Start
// button (or the Enter key) that opens the site. The particles drift in and gather into the
// letters, scatter away from the mouse, and burst outward when you press Start.
// Shown once per browser session.
const SEEN_KEY = "sage-intro-seen";
const LEAVE_MS = 1100;

// useLayoutEffect warns on the server; this picks the right one.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Phase = "showing" | "leaving" | "gone";

// Remembers the intro was seen, then fades it out.
function leave(setState: (s: Phase) => void) {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Ignore: the intro will simply show again next time.
  }
  if (!window.location.hash) window.scrollTo(0, 0);
  setState("leaving");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => setState("gone"), reduce ? 0 : LEAVE_MS);
}

export default function Intro() {
  const [state, setState] = useState<Phase>("showing");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const phaseRef = useRef<Phase>("showing"); // read by the animation loop
  useEffect(() => {
    phaseRef.current = state;
  }, [state]);

  // Already seen this session? Skip it before the first paint.
  useIsoLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) setState("gone");
    } catch {
      // Storage blocked (private mode etc.): just show the intro.
    }
  }, []);

  // Lock page scrolling while the intro is up, hide the nav, and focus the button.
  useEffect(() => {
    if (state !== "showing") return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("intro-open");
    buttonRef.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.style.overflow = previous;
      document.body.classList.remove("intro-open");
    };
  }, [state]);

  // Clicking "Draft" in the nav (/#draft) also opens the site.
  useEffect(() => {
    if (state !== "showing") return;
    const onHash = () => leave(setState);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [state]);

  // The particle lettering.
  const started = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || started.current || state === "gone") return;
    started.current = true;
    let stop = () => {};
    // Wait for the brush font, so the particles take the letters' real shape.
    document.fonts
      .load('400 200px "Sedgwick Ave Display"')
      .catch(() => undefined)
      .then(() => {
        stop = runParticles(canvas, () => phaseRef.current);
      });
    return () => stop();
  }, [state]);

  if (state === "gone") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Sage"
      onKeyDown={(e) => e.key === "Enter" && leave(setState)}
      className={`intro fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden ${
        state === "leaving" ? "intro-leaving" : ""
      }`}
    >
      <div aria-hidden className="intro-fog intro-fog-a" />
      <div aria-hidden className="intro-fog intro-fog-b" />
      <div aria-hidden className="intro-rays" />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      <h1 className="sr-only">Sage</h1>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => leave(setState)}
        className="btn btn-ghost intro-button absolute bottom-[12%]"
      >
        Start
      </button>
    </div>
  );
}

// ---------- The particle system (plain 2D canvas, no libraries) ----------

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number; // home position inside a letter
  ty: number;
  size: number;
  warm: boolean; // crimson instead of cream
  phase: number; // for twinkling
};

function runParticles(canvas: HTMLCanvasElement, phase: () => Phase): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let frame = 0;
  let leaveStart = 0;
  let depth = 3; // shadow offset step, smaller on phones
  const mouse = { x: -9999, y: -9999 };

  // Small glowing dots, drawn once and stamped many times (much faster than gradients per dot).
  function sprite(color: string) {
    const s = document.createElement("canvas");
    s.width = s.height = 32;
    const g = s.getContext("2d")!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color.replace(/[\d.]+\)$/, "0.55)"));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return s;
  }
  const cream = sprite("rgba(237,231,199,1)");
  const crimson = sprite("rgba(214,42,27,1)");
  const shadow = sprite("rgba(91,3,2,1)");

  // Draws "SAGE" off-screen and turns its pixels into particle homes.
  function layout() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const o = off.getContext("2d")!;
    const small = width < 640;
    const fontSize = Math.min(width * (small ? 0.3 : 0.24), height * 0.36, 300);
    o.font = `400 ${fontSize}px "Sedgwick Ave Display", "Arial Narrow", sans-serif`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillStyle = "#fff";
    o.translate(width / 2, height * 0.44);
    o.rotate((-4 * Math.PI) / 180);
    o.fillText("SAGE", 0, 0);

    depth = small ? 1.5 : 3;
    const data = o.getImageData(0, 0, width, height).data;
    const gap = small ? 2 : Math.max(3, Math.round(fontSize / 70));
    const homes: [number, number][] = [];
    for (let y = 0; y < height; y += gap) {
      for (let x = 0; x < width; x += gap) {
        if (data[(y * width + x) * 4 + 3] > 140) homes.push([x, y]);
      }
    }
    // Keep it fast on any laptop: at most ~6000 particles.
    const step = Math.max(1, Math.ceil(homes.length / (small ? 3500 : 6000)));
    const picked = homes.filter((_, i) => i % step === 0);

    particles = picked.map(([tx, ty]) => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.max(width, height) * (0.5 + Math.random() * 0.5);
      return {
        x: reduce ? tx : width / 2 + Math.cos(angle) * r,
        y: reduce ? ty : height / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        tx,
        ty,
        size: small ? 1 + Math.random() * 1.3 : 2.2 + Math.random() * 2.6,
        warm: Math.random() < 0.22,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }

  function draw(t: number) {
    const leaving = phase() === "leaving";
    if (leaving && !leaveStart) leaveStart = t;
    const out = leaveStart ? Math.min(1, (t - leaveStart) / 900) : 0;

    ctx!.clearRect(0, 0, width, height);
    ctx!.globalCompositeOperation = "source-over";

    // 1. Depth: a dark-red copy of every particle, offset down-right like 3D lettering.
    if (!leaving) {
      ctx!.globalAlpha = 0.55;
      for (const p of particles) {
        for (let d = depth; d <= depth * 3; d += depth) ctx!.drawImage(shadow, p.x + d - p.size, p.y + d - p.size, p.size * 2, p.size * 2);
      }
    }

    // 2. The glowing particles themselves.
    ctx!.globalCompositeOperation = "lighter";
    for (const p of particles) {
      if (!reduce) {
        if (leaving) {
          // Burst outward from the centre.
          const dx = p.x - width / 2;
          const dy = p.y - height * 0.44;
          const len = Math.hypot(dx, dy) || 1;
          p.vx += (dx / len) * 1.6;
          p.vy += (dy / len) * 1.6;
        } else {
          // Spring towards home, and away from the mouse.
          p.vx += (p.tx - p.x) * 0.012;
          p.vy += (p.ty - p.y) * 0.012;
          const mx = p.x - mouse.x;
          const my = p.y - mouse.y;
          const dist2 = mx * mx + my * my;
          if (dist2 < 110 * 110) {
            const force = (1 - Math.sqrt(dist2) / 110) * 3.2;
            const len = Math.sqrt(dist2) || 1;
            p.vx += (mx / len) * force;
            p.vy += (my / len) * force;
          }
        }
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
      }
      const twinkle = reduce ? 0.9 : 0.65 + 0.35 * Math.sin(t / 380 + p.phase);
      ctx!.globalAlpha = twinkle * (1 - out);
      const s = p.size * (p.warm ? 1.15 : 1);
      ctx!.drawImage(p.warm ? crimson : cream, p.x - s, p.y - s, s * 2, s * 2);
    }
    ctx!.globalAlpha = 1;
  }

  function loop(t: number) {
    draw(t);
    frame = requestAnimationFrame(loop);
  }

  function onMove(e: PointerEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  function onLeaveWindow() {
    mouse.x = mouse.y = -9999;
  }
  function onResize() {
    layout();
    if (reduce) draw(0);
  }

  layout();
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerleave", onLeaveWindow);
  window.addEventListener("resize", onResize);
  if (reduce) draw(0);
  else frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerleave", onLeaveWindow);
    window.removeEventListener("resize", onResize);
  };
}
