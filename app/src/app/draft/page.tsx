import type { Metadata } from "next";
import { CONTRACT_TYPES } from "@/contracts/registry";
import DraftCarousel from "@/components/draft-carousel";
import { Reveal } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Draft an agreement — Sage",
  description: "Pick an agreement and describe the deal in plain words. Sage builds it from verified clauses.",
};

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

// All agreement types (the ring of cards), and how Sage works. This used to sit below the hero
// on the home page; the home page is now the 3D journey, whose first disc links here.
export default function DraftIndex() {
  return (
    <main className="relative pt-16">
      {/* ---------- 01 Draft: pinned 3D ring of agreement cards ---------- */}
      <DraftCarousel
        cards={CONTRACT_TYPES.map((t) => ({ id: t.id, name: t.name, description: t.description }))}
      />

      {/* ---------- 04 How it works ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="kicker">04 / Why you can trust it</p>
          <h2 className="display extrude mt-3 text-5xl font-[800] text-ink md:text-6xl">
            AI for the talking. Code for the{" "}
            <span className="script ml-1 inline-block text-[1.3em]">law.</span>
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
