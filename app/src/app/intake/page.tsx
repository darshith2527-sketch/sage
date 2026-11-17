"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkDeal, emptyDeal, FIELDS, mergeDeal, type Deal, type Milestone } from "@/lib/deal";

const EXAMPLE =
  "I'm designing a website for Mehta Traders. ₹60,000 in three stages: design, development and launch. Starting 1 December, done by end of January.";

export default function IntakePage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/intake" }),
  });
  const busy = status === "submitted" || status === "streaming";

  // Rebuild the deal from every updateDeal call the AI has made so far.
  const deal = useMemo(() => {
    let current: Deal = emptyDeal;
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-updateDeal" &&
          "state" in part &&
          (part.state === "input-available" || part.state === "output-available")
        ) {
          current = mergeDeal(current, part.input as Partial<Deal>);
        }
      }
    }
    return current;
  }, [messages]);

  const { missing, problems } = checkDeal(deal);

  // Keep the chat scrolled to the newest message.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[1fr_380px] md:p-8">
        {/* ---------- Chat ---------- */}
        <section className="flex h-[85vh] flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <header className="border-b border-zinc-200 px-5 py-4">
            <h1 className="text-lg font-semibold">Describe your deal</h1>
            <p className="text-sm text-zinc-500">
              Tell Sage about the work the way you&apos;d tell a friend. It will ask about anything missing.
            </p>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <button
                onClick={() => send(EXAMPLE)}
                className="w-full rounded-xl border border-dashed border-zinc-300 p-4 text-left text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">Try an example:</span> {EXAMPLE}
              </button>
            )}

            {messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              if (!text) return null;
              const mine = message.role === "user";
              return (
                <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      mine ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {busy && <p className="text-sm text-zinc-400">Sage is thinking…</p>}
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Something went wrong. Check the terminal for the error, then try again.
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-zinc-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. The client is Mehta Traders, ₹60,000 total…"
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-blue-600 px-5 text-sm font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </section>

        {/* ---------- Deal so far ---------- */}
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Deal so far</h2>
            <span className="text-xs text-zinc-500">
              {FIELDS.length - missing.length}/{FIELDS.length} filled
            </span>
          </div>

          <dl className="space-y-3">
            {FIELDS.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
                <dd className="text-sm">{renderValue(key, deal[key])}</dd>
              </div>
            ))}
          </dl>

          {problems.length > 0 && (
            <div className="mt-4 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {problems.map((p) => (
                <p key={p}>⚠ {p}</p>
              ))}
            </div>
          )}

          {missing.length === 0 && problems.length === 0 && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              All details collected. Next step: drafting the contract.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

function renderValue(key: keyof Deal, value: Deal[keyof Deal]) {
  if (value === null || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-zinc-400">—</span>;
  }
  if (key === "totalFee" && typeof value === "number") {
    return `₹${value.toLocaleString("en-IN")}`;
  }
  if (key === "milestones" && Array.isArray(value)) {
    return (
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        {(value as Milestone[]).map((m, i) => (
          <li key={i}>
            {m.title}
            {m.amount !== null && ` · ₹${m.amount.toLocaleString("en-IN")}`}
            {m.dueDate && ` · by ${m.dueDate}`}
          </li>
        ))}
      </ol>
    );
  }
  return String(value);
}
