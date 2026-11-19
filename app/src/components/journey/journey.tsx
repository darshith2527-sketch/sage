"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SOCIAL_LINKS } from "@/lib/site";
import type { JourneyHandle } from "./engine";
import type { Social } from "./stage-contact";
import type { Theme } from "./stage-scales";

// The home page: a single 3D journey instead of a scrolling page.
//   1. the opening screen (SAGE in light rays)  →  scroll / "Start the journey"
//   2. the particle balance scale, circled by four glass discs (Sage's four themes)
//   3. the destination: a column of light, a message and the social links
// Scrolling never moves the page; it moves the camera. Each 3D disc or button has a real link
// laid over it (positioned every frame by the engine), so mouse, keyboard and screen readers
// all work. Without WebGL, a plain version of the same content is shown.

const SUBTITLE = "Law that speaks your language";

const THEMES: (Theme & { href: string; label: string; external?: boolean })[] = [
  { number: "01", title: ["BUILDING", "& MAKING"], text: "Draft agreements from verified clauses, in plain words.", href: "/draft", label: "Building and making: draft an agreement" },
  { number: "02", title: ["CREATING", "& REVIEWING"], text: "Create documents, and check the ones you're asked to sign.", href: "/review", label: "Documentation: create and review documents" },
  { number: "03", title: ["LEARNING", "& RESEARCH"], text: "Know your rights, with the exact law behind every answer.", href: "/rights", label: "Learning and research: know your rights" },
  {
    number: "04",
    title: ["PROJECTS", "& DEVELOPMENT"],
    text: "Sage is built in the open. Explore the code.",
    href: SOCIAL_LINKS.find((l) => l.label === "GitHub")?.href || "https://github.com",
    label: "Projects and development: Sage on GitHub",
    external: true,
  },
];
const SOCIALS: Social[] = SOCIAL_LINKS.filter((l) => l.href);

// "Start the journey" opens these: the useful places to begin, right from the opening screen.
const QUICK_START = [
  { title: "Draft an agreement", text: "Describe the deal in plain words.", href: "/draft" },
  { title: "Review an agreement", text: "See what could hurt you before you sign.", href: "/review" },
  { title: "Know your rights", text: "Calm next steps, with the exact law.", href: "/rights" },
];
const MESSAGE: [string, string] = ["Building Sage in the open.", "Follow along, share an idea, or open an issue."];

export default function Journey() {
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const discRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const socialRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const handleRef = useRef<JourneyHandle | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  // Move focus into the menu when it opens; Escape closes it.
  useEffect(() => {
    if (!menuOpen) return;
    // Wait until the menu has started to fade in: hidden elements can't take focus.
    const focusTimer = window.setTimeout(() => firstItemRef.current?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        startRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const section = sectionRef.current;
    const mount = mountRef.current;
    if (!section || !mount) return;
    // The journey replaces page scrolling while it is on screen.
    const html = document.documentElement;
    const previous = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    let cancelled = false;
    (async () => {
      const [THREE, { startJourney }, home, scales, contact, shared] = await Promise.all([
        import("three"),
        import("./engine"),
        import("./stage-home"),
        import("./stage-scales"),
        import("./stage-contact"),
        import("./shared"),
      ]);
      await shared.loadJourneyFonts();
      if (cancelled) return;
      handleRef.current = startJourney(THREE, {
        section,
        mount,
        makeStages: (T, renderer, env) => [
          home.createHomeStage(T, renderer, { ...env, subtitle: SUBTITLE }),
          scales.createScalesStage(T, renderer, { ...env, themes: THEMES }),
          contact.createContactStage(T, renderer, { tier: env.tier, socials: SOCIALS, message: MESSAGE }),
        ],
        hotspotLinks: {
          scales: discRefs.current.filter((el): el is HTMLAnchorElement => !!el),
          contact: socialRefs.current.filter((el): el is HTMLAnchorElement => !!el),
        },
        onProgress: (stage, p) => {
          if (stage === "home") section.style.setProperty("--home-p", p.toFixed(3));
        },
      });
    })();
    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
      html.style.overflow = previous.overflow;
      html.style.overscrollBehavior = previous.overscroll;
    };
  }, []);

  return (
    <section ref={sectionRef} aria-label="Sage" className="journey fixed inset-0 z-20 overflow-hidden">
      <div ref={mountRef} aria-hidden className="absolute inset-0" />
      <h1 className="sr-only">Sage — {SUBTITLE}</h1>

      {/* Opening screen controls (fade out as you travel in) */}
      <div className="journey-home pointer-events-none absolute inset-0">
        <div className={`absolute inset-x-0 top-[81.2%] flex -translate-y-1/2 justify-center transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`}>
          <button
            ref={startRef}
            type="button"
            className={`cosmic-btn ${menuOpen ? "" : "pointer-events-auto"}`}
            aria-expanded={menuOpen}
            aria-controls="quick-start"
            tabIndex={menuOpen ? -1 : 0}
            onClick={() => setMenuOpen(true)}
          >
            Start the journey
          </button>
        </div>
        <p className={`journey-hint absolute inset-x-0 top-[87.4%] -translate-y-1/2 text-center transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`}>
          Scroll to explore
        </p>

        {/* Quick start: where to begin */}
        <div id="quick-start" className={`quick-start ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen} role="group" aria-label="Start with Sage">
          <ul className="quick-start-list">
            {QUICK_START.map((q, i) => (
              <li key={q.href}>
                <Link ref={i === 0 ? firstItemRef : undefined} href={q.href} className="quick-start-item frame" tabIndex={menuOpen ? 0 : -1}>
                  <span className="hud-label text-[1rem] text-[#E6F0FF]">{q.title}</span>
                  <span className="quick-start-text">{q.text}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-center gap-5">
            <button
              type="button"
              className="hud-label text-[0.82rem] text-[#6bb8ff] transition-colors hover:text-[#E6F0FF]"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                setMenuOpen(false);
                handleRef.current?.goTo(1);
              }}
            >
              Explore the journey ↓
            </button>
            <button
              type="button"
              aria-label="Close"
              className="hud-label text-[0.82rem] text-[#7f9ad8] transition-colors hover:text-[#E6F0FF]"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                setMenuOpen(false);
                startRef.current?.focus({ preventScroll: true });
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Links over the four 3D discs */}
      <nav aria-label="Sage themes">
        {THEMES.map((t, i) => {
          const props = {
            ref: (el: HTMLAnchorElement | null) => {
              discRefs.current[i] = el;
            },
            "aria-label": t.label,
            className: "journey-spot",
            onFocus: () => handleRef.current?.focusHotspot("scales", i),
          };
          return t.external ? (
            <a key={t.number} href={t.href} target="_blank" rel="noopener noreferrer" {...props} />
          ) : (
            <Link key={t.number} href={t.href} {...props} />
          );
        })}
      </nav>

      {/* Links over the social buttons */}
      <nav aria-label="Social profiles">
        {SOCIALS.map((s, i) => (
          <a
            key={s.label}
            ref={(el) => {
              socialRefs.current[i] = el;
            }}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className="journey-spot"
          />
        ))}
      </nav>

      {/* Without WebGL: the same content as plain HTML */}
      <div className="journey-fallback absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <p className="cosmic-title-static">SAGE</p>
        <p className="text-ink-muted">{SUBTITLE}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {THEMES.map((t) => (
            <li key={t.number}>
              <a href={t.href} className="cosmic-btn" {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {t.title.join(" ")}
              </a>
            </li>
          ))}
        </ul>
        <ul className="flex gap-4">
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="hud-label text-[#c3cdf3]">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
