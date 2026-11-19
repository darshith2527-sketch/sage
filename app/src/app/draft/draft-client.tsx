"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkDeal, emptyDeal, formatForPanel, mergeDeal, type Contract } from "@/contracts/engine";
import { getContractType } from "@/contracts/registry";
import type { DealValues } from "@/contracts/types";
import ContractView from "./contract-view";

export default function DraftClient({ typeId }: { typeId: string }) {
  // The page checked the id exists before rendering this component.
  const type = getContractType(typeId)!;

  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    // The type goes in the URL so the server knows which fields to collect.
    transport: new DefaultChatTransport({ api: `/api/intake?type=${type.id}` }),
  });
  const busy = status === "submitted" || status === "streaming";

  // Rebuild the deal from every updateDeal call the AI has made so far.
  const deal = useMemo(() => {
    let current: DealValues = emptyDeal(type);
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-updateDeal" &&
          "state" in part &&
          (part.state === "input-available" || part.state === "output-available")
        ) {
          current = mergeDeal(type, current, part.input as DealValues);
        }
      }
    }
    return current;
  }, [messages, type]);

  const { missing, problems } = checkDeal(type, deal);
  const requiredCount = type.fields.filter((f) => f.required).length;
  // Only offer optional clauses that fit this deal (e.g. escrow only for milestone payments).
  const optionalClauses = type.clauses.filter(
    (c) => c.include === "optional" && (!c.onlyIf || deal[c.onlyIf.field] === c.onlyIf.equals),
  );

  // Drafting: which optional clauses are ticked, and the finished contract.
  const [optional, setOptional] = useState<string[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  async function draftContract() {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type.id, deal, optional }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Drafting failed.");
      setContract(data.contract);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setDrafting(false);
    }
  }

  // Keep the chat scrolled to the newest message. Only the chat box scrolls, not the page.
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = chatRef.current;
    if (box && messages.length > 0) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 md:px-8 md:pt-28">
      <div className="mb-6">
        <Link href="/draft" className="kicker hover:text-ink">
          ← All agreements
        </Link>
        <h1 className="display extrude mt-2 text-5xl font-[800] text-ink md:text-6xl">{type.name}</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Tell Sage about the deal the way you&apos;d tell a friend. It will ask about anything missing.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        {/* ---------- Chat ---------- */}
        <section className="hud flex h-[70vh] min-h-[460px] flex-col">
          <div ref={chatRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <button
                onClick={() => send(type.example)}
                className="w-full border border-dashed border-line bg-white/[0.02] p-4 text-left text-sm leading-relaxed text-ink-muted transition-colors hover:border-accent hover:bg-white/[0.05]"
              >
                <span className="kicker mb-1 block">Try an example</span>
                {type.example}
              </button>
            )}

            {messages.map((message) => {
              const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
              if (!text) return null;
              const mine = message.role === "user";
              return (
                <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? "bg-glow/25 text-ink shadow-[inset_0_0_0_1px_rgba(127,178,255,0.45)]"
                        : "bg-white/[0.05] text-ink shadow-[inset_0_0_0_1px_rgba(110,160,255,0.18)]"
                    }`}
                  >
                    {!mine && <span className="kicker mb-1 block text-[0.65rem]">Sage</span>}
                    {text}
                  </div>
                </div>
              );
            })}

            {busy && <p className="kicker animate-pulse text-ink-faint">Sage is thinking…</p>}
            {error && (
              <p className="border border-high/40 bg-high/10 p-3 text-sm text-high">
                Something went wrong. Please try again.
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the deal…"
              aria-label="Message to Sage"
              className="field flex-1"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary">
              Send
            </button>
          </form>
        </section>

        {/* ---------- Deal so far ---------- */}
        <aside className="hud h-fit p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="display text-xl text-ink">Deal so far</h2>
            <span className="kicker text-ink-faint">
              {requiredCount - missing.length}/{requiredCount} filled
            </span>
          </div>
          {/* Progress bar */}
          <div className="mb-5 h-0.5 bg-line/40">
            <div
              className="h-full bg-accent shadow-[0_0_8px_var(--glow)] transition-all duration-500"
              style={{ width: `${((requiredCount - missing.length) / requiredCount) * 100}%` }}
            />
          </div>

          <dl className="space-y-3">
            {type.fields.map((field) => {
              const shown = formatForPanel(field, deal[field.key]);
              return (
                <div key={field.key}>
                  <dt className="kicker text-[0.68rem] text-ink-faint">{field.label}</dt>
                  <dd className="text-sm text-ink">
                    {shown === null ? (
                      <span className="text-ink-faint">—</span>
                    ) : Array.isArray(shown) ? (
                      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                        {shown.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ol>
                    ) : (
                      shown
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          {problems.length > 0 && (
            <div className="mt-5 space-y-1 border border-medium/40 bg-medium/10 p-3 text-sm text-medium">
              {problems.map((p) => (
                <p key={p}>⚠ {p}</p>
              ))}
            </div>
          )}

          {missing.length === 0 && problems.length === 0 && (
            <div className="mt-5 space-y-3 border border-ok/40 bg-ok/10 p-3 text-sm text-ink">
              <p className="text-ok">
                All details collected.{optionalClauses.length > 0 && " Add any optional clauses, then draft."}
              </p>
              {optionalClauses.map((c) => (
                <label key={c.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 accent-[var(--glow)]"
                    checked={optional.includes(c.id)}
                    onChange={(e) =>
                      setOptional(e.target.checked ? [...optional, c.id] : optional.filter((id) => id !== c.id))
                    }
                  />
                  <span>
                    <span className="font-semibold">{c.title}</span>
                    <span className="block text-xs text-ink-muted">{c.plainExplanation}</span>
                  </span>
                </label>
              ))}
              <button onClick={draftContract} disabled={drafting} className="btn btn-primary w-full">
                {drafting ? "Drafting…" : contract ? "Draft again" : "Draft contract"}
              </button>
              {draftError && <p className="text-high">{draftError}</p>}
            </div>
          )}
        </aside>
      </div>
      {contract && <ContractView contract={contract} />}
    </main>
  );
}
