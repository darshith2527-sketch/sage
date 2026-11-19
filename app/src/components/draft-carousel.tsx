"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Card = { id: string; name: string; description: string };

// The "01 / Draft" section. While you scroll through it, the section stays pinned
// to the screen and the agreement cards turn on a 3D ring instead of the page moving.
// Also works with trackpad side-swipes, arrow keys, the arrow buttons and dots,
// and swiping on phones.
export default function DraftCarousel({ cards }: { cards: Card[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const count = cards.length;
  const STEP = 34; // degrees between neighbouring cards on the ring

  // Where the page must be scrolled to so card `index` faces the front.
  const scrollTopFor = useCallback(
    (index: number) => {
      const section = sectionRef.current;
      if (!section) return 0;
      const span = section.offsetHeight - window.innerHeight;
      return section.offsetTop + (span * index) / Math.max(1, count - 1);
    },
    [count],
  );

  const goTo = useCallback(
    (index: number) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clamped = Math.max(0, Math.min(count - 1, index));
      window.scrollTo({ top: scrollTopFor(clamped), behavior: reduce ? "auto" : "smooth" });
    },
    [count, scrollTopFor],
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = 0; // the ring's position, eased towards the scroll position
    let frame = 0;
    let snapTimer: ReturnType<typeof setTimeout> | undefined;
    let width = 0;
    let radius = 0;

    function measure() {
      // Card width, and a ring radius that keeps neighbouring cards from overlapping.
      width = Math.min(460, window.innerWidth * 0.78);
      radius = (width / 2 + 28) / Math.tan(((STEP / 2) * Math.PI) / 180);
      for (const card of cardRefs.current) if (card) card.style.width = `${width}px`;
    }

    // How far through the section we are, as a card index (0 … count-1).
    function target() {
      const span = section!.offsetHeight - window.innerHeight;
      const p = span > 0 ? (window.scrollY - section!.offsetTop) / span : 0;
      return Math.max(0, Math.min(1, p)) * (count - 1);
    }

    function draw() {
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const d = i - current; // distance from the front, in cards
        const far = Math.abs(d);
        card.style.transform = `translate(-50%, -50%) translateZ(${-radius}px) rotateY(${d * STEP}deg) translateZ(${radius}px)`;
        card.style.opacity = String(Math.max(0, 1 - far * 0.38));
        card.style.zIndex = String(100 - Math.round(far * 10));
        card.style.pointerEvents = far > 1.6 ? "none" : "auto";
        card.style.filter = `brightness(${1 - Math.min(far, 1.5) * 0.3})`;
      });
      const nearest = Math.round(current);
      setActive((prev) => (prev === nearest ? prev : nearest));
    }

    function tick() {
      const goal = target();
      current = reduce ? goal : current + (goal - current) * 0.12;
      if (Math.abs(goal - current) < 0.001) current = goal;
      draw();
      frame = requestAnimationFrame(tick);
    }

    // After scrolling stops inside the section, settle on the nearest card.
    function onScroll() {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const top = section!.offsetTop;
        const bottom = top + section!.offsetHeight - window.innerHeight;
        if (window.scrollY <= top + 2 || window.scrollY >= bottom - 2) return;
        const index = Math.round(target());
        if (Math.abs(window.scrollY - scrollTopFor(index)) > 4) {
          window.scrollTo({ top: scrollTopFor(index), behavior: reduce ? "auto" : "smooth" });
        }
      }, 160);
    }

    // Trackpad side-swipes scroll through the cards too.
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) {
        e.preventDefault();
        window.scrollBy({ top: e.deltaX * 2 });
      }
    }

    // Phone swipes left/right.
    let touchX = 0;
    let touchY = 0;
    function onTouchStart(e: TouchEvent) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goTo(Math.round(target()) + (dx < 0 ? 1 : -1));
      }
    }

    measure();
    current = target();
    tick();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(snapTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchend", onTouchEnd);
    };
  }, [count, goTo, scrollTopFor]);

  return (
    <section
      id="draft"
      ref={sectionRef}
      // Taller than the screen: the extra height is the scroll distance used to turn the ring.
      style={{ height: `${100 + (count - 1) * 70}svh` }}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goTo(active + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          goTo(active - 1);
        }
      }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pt-24 md:pt-28">
        <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
          <p className="kicker">01 / Draft</p>
          <h2 className="display extrude mt-3 text-5xl font-[800] text-ink md:text-6xl">
            Describe the deal. Get the{" "}
            <span className="script ml-1 inline-block text-[1.25em]">agreement.</span>
          </h2>
          <p className="mt-3 max-w-xl text-ink-muted">Pick an agreement. Sage asks about anything that&apos;s missing.</p>
        </div>

        {/* The 3D ring */}
        <div className="pointer-events-none relative flex-1 [perspective:1500px]" aria-roledescription="carousel" aria-label="Agreement types">
          <div className="pointer-events-none absolute inset-0 [transform-style:preserve-3d]">
            {cards.map((card, i) => (
              <Link
                key={card.id}
                href={`/draft/${card.id}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                onClick={(e) => {
                  // A side card turns the ring to the front first; the front card opens.
                  if (i !== active) {
                    e.preventDefault();
                    goTo(i);
                  }
                }}
                onFocus={() => i !== active && goTo(i)}
                aria-label={`${card.name}: ${card.description}`}
                className={`hud hud-strong group absolute left-1/2 top-[46%] block p-7 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] md:p-9 ${
                  i === active ? "shadow-[0_0_60px_-10px_var(--glow)]" : ""
                }`}
                style={{ backdropFilter: "none", WebkitBackdropFilter: "none", transition: "box-shadow 0.3s" }}
              >
                <p className="kicker text-ink-faint">
                  {String(i + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
                </p>
                <h3 className="display extrude mt-3 text-4xl font-[800] text-ink md:text-5xl">{card.name}</h3>
                <p className="mt-3 min-h-[3.2rem] text-sm leading-relaxed text-ink-muted md:text-base">
                  {card.description}
                </p>
                <p className="display mt-6 text-sm tracking-widest text-accent">
                  {i === active ? (
                    <>
                      Start <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </>
                  ) : (
                    "Bring to front"
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mx-auto mb-8 flex w-full max-w-6xl items-center justify-center gap-5 px-5 md:mb-10">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            className="btn btn-ghost px-4"
            aria-label="Previous agreement"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            {cards.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${card.name}`}
                aria-current={i === active}
                className={`h-1.5 transition-all duration-300 ${
                  i === active ? "w-8 bg-gold shadow-[0_0_8px_var(--gold)]" : "w-3 bg-line hover:bg-ink-muted"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === count - 1}
            className="btn btn-ghost px-4"
            aria-label="Next agreement"
          >
            →
          </button>
        </div>
        <p className="kicker -mt-5 mb-6 text-center text-[0.65rem] text-ink-faint md:mb-8">
          Scroll or swipe to turn · Enter to open
        </p>
      </div>
    </section>
  );
}
