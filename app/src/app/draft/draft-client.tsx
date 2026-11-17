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
  const optionalClauses = type.clauses.filter((c) => c.include === "optional");

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
            <Link href="/" className="text-xs text-blue-600">
              ← All agreements
            </Link>
            <h1 className="mt-1 text-lg font-semibold">{type.name}</h1>
            <p className="text-sm text-zinc-500">
              Tell Sage about the deal the way you&apos;d tell a friend. It will ask about anything missing.
            </p>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <button
                onClick={() => send(type.example)}
                className="w-full rounded-xl border border-dashed border-zinc-300 p-4 text-left text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">Try an example:</span> {type.example}
              </button>
            )}

            {messages.map((message) => {
              const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
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
              placeholder="Describe the deal…"
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
              {requiredCount - missing.length}/{requiredCount} filled
            </span>
          </div>

          <dl className="space-y-3">
            {type.fields.map((field) => {
              const shown = formatForPanel(field, deal[field.key]);
              return (
                <div key={field.key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{field.label}</dt>
                  <dd className="text-sm">
                    {shown === null ? (
                      <span className="text-zinc-400">—</span>
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
            <div className="mt-4 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {problems.map((p) => (
                <p key={p}>⚠ {p}</p>
              ))}
            </div>
          )}

          {missing.length === 0 && problems.length === 0 && (
            <div className="mt-4 space-y-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">
              <p>All details collected.{optionalClauses.length > 0 && " Add any optional clauses, then draft."}</p>
              {optionalClauses.map((c) => (
                <label key={c.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={optional.includes(c.id)}
                    onChange={(e) =>
                      setOptional(e.target.checked ? [...optional, c.id] : optional.filter((id) => id !== c.id))
                    }
                  />
                  <span>
                    <span className="font-medium">{c.title}</span>
                    <span className="block text-xs text-green-800">{c.plainExplanation}</span>
                  </span>
                </label>
              ))}
              <button
                onClick={draftContract}
                disabled={drafting}
                className="w-full rounded-xl bg-green-700 py-2.5 font-medium text-white disabled:opacity-50"
              >
                {drafting ? "Drafting…" : contract ? "Draft again" : "Draft contract"}
              </button>
              {draftError && <p className="text-red-700">{draftError}</p>}
            </div>
          )}
        </aside>
      </div>
      {contract && <ContractView contract={contract} />}
    </main>
  );
}
