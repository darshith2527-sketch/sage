import Link from "next/link";
import { CONTRACT_TYPES } from "@/contracts/registry";
import { Reveal } from "@/components/site-chrome";

const HOW_IT_WORKS = [
  {
    title: "You talk. AI listens.",
    text: "Describe the deal the way you'd tell a friend. The AI only collects the details. It never writes legal text.",
  },
  {
    title: "Verified clauses",
    text: "Every agreement is assembled from Sage's clause library, written against Indian law, with the Act behind each clause.",
  },
  {
    title: "Numbers by code",
    text: "Milestones, EMI schedules, totals and amounts in words are calculated and checked in code, so they always add up.",
  },
  {
    title: "Quotes checked word for word",
    text: "When Sage flags a risk in your agreement, code confirms the quoted clause really exists. Nothing is made up.",
  },
];

export default function Home() {
  return (
    <main className="relative">
      {/* ---------- Hero ---------- */}
      <section className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-5 pb-16 pt-28 md:px-8">
        <div className="max-w-xl">
          <p className="kicker">AI for agreements · Built for India</p>
          <h1 className="display mt-4 text-6xl font-semibold text-ink sm:text-7xl md:text-8xl">
            Agreements
            <br />
            <span className="text-accent">you understand</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
            Describe your deal in plain words. Sage builds the agreement from verified clauses and explains
            every one. Already have an agreement? Sage shows you what could hurt you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#draft" className="btn btn-primary">
              Draft an agreement
            </Link>
            <Link href="/review" className="btn btn-ghost">
              Review one
            </Link>
          </div>
        </div>
        <p className="kicker mt-16 animate-pulse text-ink-faint md:mt-24">Scroll ↓</p>
      </section>

      {/* ---------- 01 Draft ---------- */}
      <section id="draft" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 md:px-8">
        <Reveal>
          <p className="kicker">01 / Draft</p>
          <h2 className="display mt-3 text-4xl text-ink md:text-5xl">Describe the deal. Get the agreement.</h2>
          <p className="mt-3 max-w-xl text-ink-muted">Pick an agreement. Sage asks about anything that&apos;s missing.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CONTRACT_TYPES.map((type, i) => (
            <Reveal key={type.id} delay={i * 90}>
              <Link href={`/draft/${type.id}`} className="hud group block h-full p-6 md:p-7">
                <p className="kicker text-ink-faint">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display mt-2 text-2xl text-ink">{type.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{type.description}</p>
                <p className="display mt-5 text-sm tracking-widest text-accent">
                  Start <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 02 Review ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <div className="hud grid gap-8 p-7 md:grid-cols-2 md:p-10">
            <div>
              <p className="kicker">02 / Review</p>
              <h2 className="display mt-3 text-4xl text-ink md:text-5xl">Already have an agreement?</h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                Upload a PDF, Word file or text. Sage flags risky and one-sided clauses, quotes them exactly,
                explains why they matter under Indian law and suggests what to ask for instead.
              </p>
              <Link href="/review" className="btn btn-primary mt-6">
                Review an agreement
              </Link>
            </div>
            {/* A preview of what a flagged risk looks like */}
            <div aria-hidden className="hud hud-strong self-center p-5 [--cut:10px]">
              <div className="flex items-center gap-2">
                <span className="badge badge-high">High</span>
                <span className="display text-lg text-ink">Payment only on satisfaction</span>
              </div>
              <p className="mt-3 border-l-2 border-line pl-3 text-sm italic text-ink-muted">
                “…within 90 days after the Company, in its sole discretion, confirms that it is satisfied…”
              </p>
              <p className="mt-3 text-sm text-ink-muted">You might never be paid if the client is never “satisfied”.</p>
              <p className="mt-2 text-sm text-ok">Ask for: payment within 15 days of delivery.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- 03 How it works ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="kicker">03 / Why you can trust it</p>
          <h2 className="display mt-3 text-4xl text-ink md:text-5xl">AI for the talking. Code for the law.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, i) => (
            <Reveal key={item.title} delay={i * 90}>
              <div className="hud h-full p-6">
                <p className="kicker text-ink-faint">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display mt-2 text-xl text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-12 pt-8 md:px-8">
        <p className="border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
          Sage is not a law firm and doesn&apos;t give legal advice. Have a lawyer review important agreements.
          Stamp duty and registration rules vary by state.
        </p>
      </footer>
    </main>
  );
}
