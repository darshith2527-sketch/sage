"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { SOCIAL_LINKS } from "@/lib/site";
import ParticleScene from "./particle-scene";

// The 3D background: a calm particle ocean. The home page is its own full-screen 3D journey,
// so it gets no backdrop (and no footer: its last stage holds the social links).
export function Backdrop() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <ParticleScene variant="ambient" />;
}

const LINKS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/draft", label: "Draft", match: (p: string) => p.startsWith("/draft") },
  { href: "/review", label: "Review", match: (p: string) => p.startsWith("/review") },
  { href: "/rights", label: "Rights", match: (p: string) => p.startsWith("/rights") },
];

// The minimal navigation frame in the top-left corner.
export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="site-nav fixed left-3 top-3 z-50 sm:left-5 sm:top-5">
      <ul className="frame flex h-10 items-center px-3.5 sm:h-12 sm:px-5">
        {LINKS.map((link, i) => (
          <li key={link.href} className="flex items-center">
            {i > 0 && <span aria-hidden className="mx-3 h-4 w-px bg-[rgba(80,125,240,0.75)] sm:mx-[1.05rem] sm:h-5" />}
            <Link
              href={link.href}
              aria-current={link.match(pathname) ? "page" : undefined}
              className={`hud-label text-[0.82rem] sm:text-[0.95rem] ${link.match(pathname) ? "text-[#6aa6ff]" : "text-[#c3cdf3]"}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// A tiny scales-of-justice logo.
export function ScalesMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-gold ${className}`}>
      <path d="M12 3v17M7 20h10M4 7h16M12 3.5a1 1 0 1 0 0 .01" strokeLinecap="round" />
      <path d="M4 7l-2.5 6a2.5 2.5 0 0 0 5 0L4 7zM20 7l-2.5 6a2.5 2.5 0 0 0 5 0L20 7z" strokeLinejoin="round" />
    </svg>
  );
}

// Fades a panel in as it scrolls into view.
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// Simple outline icons for the footer links.
const SOCIAL_ICONS: Record<(typeof SOCIAL_LINKS)[number]["label"], ReactNode> = {
  GitHub: (
    <path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.8 0-1 .4-1.9 1-2.6-.1-.3-.4-1.2.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.4.2 2.3.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.3 4.6-4.4 4.8.3.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z" />
  ),
  LinkedIn: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7.5 10v6.5M7.5 7.3v.1M11 16.5V10m0 3c0-1.7 1-3 2.6-3 1.5 0 2.4 1 2.4 3v3.5" />
    </>
  ),
  Instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.8" />
      <path d="M17 7v.1" />
    </>
  ),
  X: <path d="M4 4l16 16M20 4L4 20" />,
};

// The end of every page: the wordmark, links, social profiles and the disclaimer.
export function SiteFooter() {
  const pathname = usePathname();
  const links = SOCIAL_LINKS.filter((l) => l.href);
  if (pathname === "/") return null;
  return (
    <footer className="relative z-10 mt-auto border-t border-line/60 bg-[rgba(3,10,26,0.6)] backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <p className="display extrude text-6xl font-[850] text-ink md:text-7xl">Sage</p>
          <p className="script -mt-2 ml-1 text-3xl md:text-4xl">law that speaks your language</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-muted">
            Draft Indian agreements from verified clauses, and see what could hurt you in the ones you&apos;re
            asked to sign.
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="kicker">Explore</p>
          <ul className="mt-4 space-y-2">
            {[
              ["Draft an agreement", "/draft"],
              ["Review an agreement", "/review"],
              ["Know your rights", "/rights"],
              ["Freelance agreement", "/draft/freelance"],
              ["Personal loan", "/draft/loan"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="kicker">Follow the build</p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  title={link.label}
                  className="hud flex h-12 w-12 items-center justify-center text-ink-muted [--cut:8px] hover:text-ink"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    {SOCIAL_ICONS[link.label]}
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-ink-faint">
            Built for HackIndia · AI for Lawyers · PS-03
          </p>
        </div>
      </div>
      <div className="border-t border-line/40">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs leading-relaxed text-ink-faint md:px-8">
          Sage is not a law firm and doesn&apos;t give legal advice. Have a lawyer review important agreements. Stamp
          duty and registration rules vary by state.
        </p>
      </div>
    </footer>
  );
}
