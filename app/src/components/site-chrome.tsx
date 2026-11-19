"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import ParticleScene from "./particle-scene";

// The 3D background: the full scales scene on the home page, a calm ocean elsewhere.
export function Backdrop() {
  const pathname = usePathname();
  return <ParticleScene variant={pathname === "/" ? "hero" : "ambient"} />;
}

const LINKS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/#draft", label: "Draft", match: (p: string) => p.startsWith("/draft") },
  { href: "/review", label: "Review", match: (p: string) => p.startsWith("/review") },
];

// The navigation frame in the top-left corner.
export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed left-4 top-4 z-50 md:left-6 md:top-6">
      <div className="hud hud-strong flex items-center gap-1 px-4 py-2.5 [--cut:10px]">
        <Link href="/" className="display mr-2 flex items-center gap-2 text-lg text-ink" aria-label="Sage home">
          <ScalesMark />
          Sage
        </Link>
        {LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center">
            <span aria-hidden className={`mx-2 h-3.5 w-px bg-line ${i === 0 ? "hidden sm:block" : ""}`} />
            <Link
              href={link.href}
              aria-current={link.match(pathname) ? "page" : undefined}
              className={`display text-[0.95rem] transition-colors hover:text-ink ${
                link.match(pathname) ? "text-accent" : "text-ink-muted"
              } ${i === 0 ? "hidden sm:inline" : ""}`}
            >
              {link.label}
            </Link>
          </span>
        ))}
      </div>
    </nav>
  );
}

// A tiny scales-of-justice logo.
export function ScalesMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-accent ${className}`}>
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
