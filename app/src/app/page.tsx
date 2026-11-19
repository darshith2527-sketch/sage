import Link from "next/link";
import { CONTRACT_TYPES } from "@/contracts/registry";
import DraftCarousel from "@/components/draft-carousel";
import Intro from "@/components/intro";
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
      <Intro />
      {/* ---------- Hero ---------- */}
      <section className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-5 pb-16 pt-28 md:px-8">
        <div className="max-w-2xl">
          <p className="kicker">For freelancers, founders &amp; families in India</p>
          {/* Heavy 3D lettering with a brushed script line across it */}
          <h1 className="mt-5">
            <span className="display extrude-xl block text-[clamp(4.4rem,11.5vw,10rem)] font-[900] leading-[0.82] tracking-[0.01em] text-ink">
              Agreements
            </span>
            <span className="script relative z-10 -mt-[0.62em] ml-[1.1em] block -rotate-[6deg] whitespace-nowrap text-[clamp(2.7rem,6.6vw,6.2rem)] leading-[1.15]">
              you understand
            </span>
          </h1>
          <p className="mt-9 max-w-md text-lg leading-relaxed text-ink-muted">
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

      {/* ---------- 01 Draft: pinned 3D ring of agreement cards ---------- */}
      <DraftCarousel
        cards={CONTRACT_TYPES.map((t) => ({ id: t.id, name: t.name, description: t.description }))}
      />

      {/* ---------- 02 Review ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <div className="hud grid gap-8 p-7 md:grid-cols-2 md:p-10">
            <div>
              <p className="kicker">02 / Review</p>
              <h2 className="display extrude mt-3 text-5xl font-[800] text-ink md:text-6xl">
                Already have an{" "}
                <span className="script ml-1 inline-block -rotate-3 text-[1.25em]">agreement?</span>
              </h2>
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
                <span className="display text-xl text-ink">Payment only on satisfaction</span>
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

      {/* ---------- 03 Know your rights ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <div className="hud grid gap-8 p-7 md:grid-cols-[1.1fr_1fr] md:p-10">
            <div>
              <p className="kicker">03 / Know your rights</p>
              <h2 className="display extrude mt-3 text-5xl font-[800] text-ink md:text-6xl">
                In a situation{" "}
                <span className="script ml-1 inline-block -rotate-3 text-[1.25em]">right now?</span>
              </h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                Stopped by traffic police, a deposit that won&apos;t come back, a complaint the police won&apos;t
                register, a UPI scam. Tell Sage what&apos;s happening and get calm next steps with the exact law,
                checked against the official text. Even when the law isn&apos;t on your side.
              </p>
              <Link href="/rights" className="btn btn-primary mt-6">
                Know your rights
              </Link>
            </div>
            <ul aria-hidden className="grid content-center gap-2 text-sm">
              {[
                "Traffic stop & e-challans",
                "Arrest & FIR rights",
                "Women's safety",
                "Tenant deposits & eviction",
                "Refunds & no-bill sellers",
                "UPI fraud & unpaid salary",
              ].map((topic) => (
                <li key={topic} className="border border-line bg-white/[0.03] px-4 py-2.5 text-ink-muted">
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ---------- 04 How it works ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="kicker">04 / Why you can trust it</p>
          <h2 className="display extrude mt-3 text-5xl font-[800] text-ink md:text-6xl">
            AI for the talking. Code for the{" "}
            <span className="script ml-1 inline-block -rotate-3 text-[1.3em]">law.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, i) => (
            <Reveal key={item.title} delay={i * 90}>
              <div className="hud h-full p-6">
                <p className="kicker text-ink-faint">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display mt-2 text-2xl text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

    </main>
  );
}
