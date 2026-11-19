"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { getRightsCard, type SituationCard } from "@/lib/rights";
import { stripCitations, type ShowRightsResult } from "@/lib/rights/guard";

const MAX_CHARS = 1000;

const EXAMPLES = [
  "A traffic cop stopped me and wants ₹2,000 in cash. I don't have my licence with me but it's in DigiLocker.",
  "My landlord isn't returning my ₹40,000 deposit even though I moved out a month ago.",
  "Police station wale meri phone chori ki FIR nahi likh rahe, bol rahe dusre thane jao.",
  "I just lost ₹15,000 after someone from the 'bank' asked for my OTP.",
];

// Splits an assistant message into its text and the cards the server approved.
// The AI may call showRights more than once in a reply, so every call's cards are kept
// (first call first), without duplicates, up to 4 cards.
function readMessage(message: UIMessage) {
  let text = "";
  const ids: string[] = [];
  let userAtFault: boolean | null = null;
  let answered = false;
  for (const part of message.parts) {
    if (part.type === "text") text += part.text;
    if (part.type === "tool-showRights" && "state" in part && part.state === "output-available") {
      const output = part.output as ShowRightsResult;
      for (const id of output.shown) if (!ids.includes(id)) ids.push(id);
      if (userAtFault === null) userAtFault = output.userAtFault;
      answered = true;
    }
  }
  // Only IDs the server checked, and only cards that exist in the library.
  const cards = ids
    .map((id) => getRightsCard(id))
    .filter((c): c is SituationCard => Boolean(c))
    .slice(0, 4);
  const result = answered ? { userAtFault } : null;
  return { text, result, cards };
}

// The error text from the server ({ error: "..." }), or a friendly default.
function errorText(error: Error) {
  try {
    return JSON.parse(error.message).error as string;
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function RightsClient() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/rights" }),
  });
  const busy = status === "submitted" || status === "streaming";

  // Keep the newest message in view.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function send(text: string) {
    const clean = text.trim().slice(0, MAX_CHARS);
    if (!clean || busy) return;
    sendMessage({ text: clean });
    setInput("");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-24 md:px-8 md:pt-28">
      <p className="kicker">03 / Know your rights</p>
      <h1 className="display extrude mt-2 text-5xl font-[800] text-ink md:text-6xl">
        Know your <span className="script ml-1 inline-block text-[1.25em]">rights</span>
      </h1>
      <p className="mt-3 max-w-xl text-ink-muted">
        In a situation right now? Tell Sage what&apos;s happening, in English, Hindi or Hinglish. You&apos;ll get
        calm next steps and the exact law that applies, checked against the official text.
      </p>

      <section className="hud mt-8 p-5 md:p-7" aria-label="Conversation">
        {messages.length === 0 && (
          <div>
            <p className="kicker text-ink-faint">Try an example</p>
            <div className="mt-3 grid gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => send(example)}
                  className="border border-dashed border-line bg-white/[0.02] p-3 text-left text-sm leading-relaxed text-ink-muted transition-colors hover:border-accent hover:bg-white/[0.05] hover:text-ink"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((message) => {
            if (message.role === "user") {
              const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap bg-glow/25 px-4 py-2.5 text-sm leading-relaxed text-ink shadow-[inset_0_0_0_1px_rgba(127,178,255,0.45)]">
                    {text}
                  </p>
                </div>
              );
            }
            const { text, result, cards } = readMessage(message);
            return (
              <div key={message.id} className="space-y-4" data-testid="assistant-message">
                {cards.some((c) => c.emergency) && (
                  <a
                    href="tel:112"
                    className="block border border-high/60 bg-high/15 px-4 py-3 text-sm font-semibold text-high"
                  >
                    In danger right now? Call 112.
                  </a>
                )}
                {text && (
                  <div className="whitespace-pre-wrap bg-white/[0.05] px-4 py-3 text-sm leading-relaxed text-ink shadow-[inset_0_0_0_1px_rgba(110,160,255,0.18)]">
                    <span className="kicker mb-1 block text-[0.65rem]">Sage</span>
                    {stripCitations(text)}
                  </div>
                )}
                {result?.userAtFault !== null && result?.userAtFault !== undefined && cards.length > 0 && (
                  <p
                    className={`inline-block border px-3 py-1 text-xs ${
                      result.userAtFault ? "border-medium/50 text-medium" : "border-ok/50 text-ok"
                    }`}
                  >
                    {result.userAtFault ? "Honest verdict: the law is against you here" : "The law is on your side here"}
                  </p>
                )}
                {cards.map((card) => (
                  <RightsCardView key={card.id} card={card} />
                ))}
              </div>
            );
          })}
          {busy && <p className="kicker animate-pulse text-ink-faint">Sage is checking the law…</p>}
          {error && <p className="border border-high/40 bg-high/10 p-3 text-sm text-high">{errorText(error)}</p>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-6 flex gap-2 border-t border-line pt-4"
        >
          <label htmlFor="situation" className="sr-only">
            Describe your situation
          </label>
          <input
            id="situation"
            value={input}
            maxLength={MAX_CHARS}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's happening? e.g. Police won't file my complaint…"
            className="field flex-1"
          />
          <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary">
            Ask
          </button>
        </form>
      </section>

      {/* Always-visible safety strip */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgba(3,10,26,0.92)] backdrop-blur-md">
        <p className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-ink-muted">
          <span>Not legal advice</span>
          <span aria-hidden className="text-line">·</span>
          <a href="tel:112" className="font-semibold text-high hover:underline">
            Emergency: 112
          </a>
          <span aria-hidden className="text-line">·</span>
          <a href="tel:15100" className="font-semibold text-ok hover:underline">
            Free legal aid: 15100
          </a>
        </p>
      </div>
    </main>
  );
}

// One verified situation card: the laws, who to call, and where to go next.
function RightsCardView({ card }: { card: SituationCard }) {
  return (
    <article className="border border-l-4 border-line border-l-accent bg-[rgba(14,34,82,0.45)] p-5 backdrop-blur-md" data-testid="rights-card">
      <p className="kicker text-[0.65rem] text-ink-faint">{card.category.replace("-", " ")}</p>
      <h3 className="display mt-1 text-2xl text-ink">{card.title}</h3>

      <ul className="mt-4 space-y-3">
        {card.rights.map((right) => (
          <li key={`${right.act}-${right.section}`} className="border-l-2 border-line pl-3">
            <p className="display text-lg text-accent">
              {right.act}, {right.section}
              {right.old_section && (
                <span className="ml-2 text-sm text-ink-faint normal-case">(earlier {right.old_section})</span>
              )}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{right.plain_explanation}</p>
            <a
              href={right.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Read the law ↗
            </a>
          </li>
        ))}
      </ul>

      {card.helplines.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.helplines.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number}`}
              className="border border-line bg-white/[0.04] px-2.5 py-1 text-xs text-ink hover:border-accent"
            >
              {h.name}: <strong>{h.number}</strong>
            </a>
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="kicker text-[0.65rem] text-ink-faint">If it goes further</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
          {card.escalation.map((e) => (
            <li key={e.label}>
              <strong className="text-ink">{e.label}:</strong> {e.detail}{" "}
              {e.url && (
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Open ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>

      {card.notes && <p className="mt-3 text-xs italic text-ink-faint">{card.notes}</p>}
      <p className="mt-3 text-[0.7rem] text-ink-faint">Checked against the official text on {card.last_verified}.</p>
    </article>
  );
}
