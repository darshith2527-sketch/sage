"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
const MESSAGE: [string, string] = ["Building Sage in the open.", "Follow along, share an idea, or open an issue."];

export default function Journey() {
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const discRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const socialRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const handleRef = useRef<JourneyHandle | null>(null);

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
        <div className="absolute inset-x-0 top-[81.2%] flex -translate-y-1/2 justify-center">
          <button type="button" className="cosmic-btn pointer-events-auto" onClick={() => handleRef.current?.goTo(1)}>
            Start the journey
          </button>
        </div>
        <p className="journey-hint absolute inset-x-0 top-[87.4%] -translate-y-1/2 text-center">Scroll to explore</p>
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
