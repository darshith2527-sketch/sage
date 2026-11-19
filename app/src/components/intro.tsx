"use client";

import "@fontsource/sedgwick-ave-display";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The opening screen: just "SAGE" in brush lettering with 3D depth, lit by light rays and a
// spotlight that follows the mouse, and a Start button (or the Enter key) that opens the site.
// Shown once per browser session.
const SEEN_KEY = "sage-intro-seen";

// useLayoutEffect warns on the server; this picks the right one.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Remembers the intro was seen, then fades it out.
function leave(setState: (s: "showing" | "leaving" | "gone") => void) {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Ignore: the intro will simply show again next time.
  }
  if (!window.location.hash) window.scrollTo(0, 0);
  setState("leaving");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => setState("gone"), reduce ? 0 : 1100);
}

export default function Intro() {
  const [state, setState] = useState<"showing" | "leaving" | "gone">("showing");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Already seen this session? Skip it before the first paint.
  useIsoLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) setState("gone");
    } catch {
      // Storage blocked (private mode etc.): just show the intro.
    }
  }, []);

  // Lock page scrolling while the intro is up, and focus the button.
  useEffect(() => {
    if (state !== "showing") return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("intro-open"); // hides the nav, so only SAGE and Start show
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

  // The spotlight follows the mouse (or a finger).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || state === "gone") return;
    function move(e: PointerEvent) {
      root!.style.setProperty("--mx", `${(e.clientX / window.innerWidth) * 100}%`);
      root!.style.setProperty("--my", `${(e.clientY / window.innerHeight) * 100}%`);
    }
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [state]);

  const enter = () => leave(setState);

  if (state === "gone") return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Sage"
      onKeyDown={(e) => e.key === "Enter" && enter()}
      className={`intro fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden ${
        state === "leaving" ? "intro-leaving" : ""
      }`}
    >
      {/* Drifting fog */}
      <div aria-hidden className="intro-fog intro-fog-a" />
      <div aria-hidden className="intro-fog intro-fog-b" />
      {/* Light rays behind the letters */}
      <div aria-hidden className="intro-rays" />

      <div className="intro-word relative select-none">
        {/* 1. A soft glow behind */}
        <span aria-hidden className="intro-letters intro-glow">
          Sage
        </span>
        {/* 2. The 3D depth */}
        <span aria-hidden className="intro-letters intro-depth">
          Sage
        </span>
        {/* 3. The lit face, brightest where the mouse is */}
        <h1 className="intro-letters intro-face">Sage</h1>
      </div>

      <button ref={buttonRef} type="button" onClick={enter} className="btn btn-ghost intro-button absolute bottom-[12%]">
        Start
      </button>
    </div>
  );
}
