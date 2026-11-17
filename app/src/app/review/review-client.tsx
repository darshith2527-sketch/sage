"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Risk } from "@/review/analysis";
import type { RuleFinding } from "@/review/rules";
import { SAMPLE_AGREEMENT, SAMPLE_SIDE } from "@/review/sample";

type ReviewResult = {
  source: string;
  firstLine: string;
  documentType: string;
  summary: string;
  risks: Risk[];
  unverifiedCount: number;
  missing: { topic: string; why: string }[];
  ruleFindings: RuleFinding[];
  truncated: boolean;
};

const SEVERITY_STYLE: Record<Risk["severity"], string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-200 text-zinc-700",
};

function Badge({ severity }: { severity: Risk["severity"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${SEVERITY_STYLE[severity]}`}>
      {severity}
    </span>
  );
}

export default function ReviewClient() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [side, setSide] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  // The file input keeps its own value, so it needs a ref to be cleared.
  const fileInput = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Bring a new result into view, so it's clear the review finished.
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  function clearAll() {
    setFile(null);
    setText("");
    setSide("");
    setResult(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function loadSample() {
    setFile(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
    setText(SAMPLE_AGREEMENT);
    setSide(SAMPLE_SIDE);
  }

  async function review() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      else form.append("text", text);
      form.append("side", side);
      const res = await fetch("/api/review", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The review failed.");
      setResult(data.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The review failed.");
    } finally {
      setBusy(false);
    }
  }

  const canReview = !busy && (file !== null || text.trim().length > 0);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Sage
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Review an agreement</h1>
        <p className="mt-2 text-zinc-600">
          Upload or paste any agreement. Sage flags risky and one-sided clauses and explains them in plain words.
        </p>

        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Don&apos;t upload confidential documents.</strong> This demo sends text to an AI provider that may
          use it to improve its models. Use the sample, or an agreement with personal details removed.
        </div>

        <section className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium" htmlFor="file">
              Upload a PDF, Word (.docx) or text file
            </label>
            <input
              id="file"
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="text">
              …or paste the text
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={file !== null}
              rows={8}
              placeholder="Paste the agreement here"
              className="mt-2 w-full rounded-lg border border-zinc-300 p-3 text-sm disabled:bg-zinc-100"
            />
            <div className="mt-1 flex gap-4">
              <button type="button" onClick={loadSample} className="text-sm text-blue-600 hover:underline">
                Try a sample one-sided agreement
              </button>
              <button type="button" onClick={clearAll} className="text-sm text-zinc-500 hover:underline">
                Clear
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="side">
              Which side are you on? (optional)
            </label>
            <input
              id="side"
              value={side}
              onChange={(e) => setSide(e.target.value)}
              placeholder="e.g. I'm the freelancer / the tenant / the borrower"
              className="mt-2 w-full rounded-lg border border-zinc-300 p-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={review}
            disabled={!canReview}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {busy ? "Reviewing… (up to a minute)" : "Review agreement"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </section>

        <div ref={resultRef} className="scroll-mt-4">
          {result && <ReviewView result={result} />}
        </div>

        <p className="mt-10 text-xs text-zinc-500">
          Sage is not a law firm and doesn&apos;t give legal advice. Have a lawyer review important agreements.
        </p>
      </div>
    </main>
  );
}

function ReviewView({ result }: { result: ReviewResult }) {
  return (
    <section className="mt-8 space-y-6" data-testid="review-result">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-3 truncate text-xs text-zinc-500" title={result.firstLine}>
          Reviewed: {result.source} — “{result.firstLine}”
        </p>
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{result.documentType}</p>
        <p className="mt-2">{result.summary}</p>
        {result.truncated && (
          <p className="mt-2 text-sm text-amber-700">This document was long, so only the first part was reviewed.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold">Risks found ({result.risks.length})</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Every quote below was checked word for word against your document.
          {result.unverifiedCount > 0 &&
            ` ${result.unverifiedCount} more flag${result.unverifiedCount === 1 ? "" : "s"} couldn't be matched to the text and ${result.unverifiedCount === 1 ? "was" : "were"} hidden.`}
        </p>
        <div className="mt-4 space-y-4">
          {result.risks.map((risk, i) => (
            <article key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge severity={risk.severity} />
                <h3 className="font-semibold">{risk.title}</h3>
                <span className="text-xs text-zinc-500">Favours: {risk.favours}</span>
              </div>
              <blockquote className="mt-3 border-l-4 border-zinc-300 pl-3 text-sm italic text-zinc-700">
                “{risk.quote}”
              </blockquote>
              <p className="mt-3 text-sm">{risk.explanation}</p>
              <p className="mt-2 text-sm text-green-800">
                <strong>Ask for:</strong> {risk.suggestion}
              </p>
              {risk.confirmedBy?.map((c) => (
                <p key={c.title} className="mt-3 inline-block rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-800">
                  ✓ Also caught by Sage&apos;s Indian-law check: {c.title} ({c.legalBasis})
                </p>
              ))}
            </article>
          ))}
        </div>
      </div>

      {result.ruleFindings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">
            {result.risks.some((r) => r.confirmedBy) ? "More Indian-law checks" : "Indian-law checks"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Fixed rules run by code, not AI. A match means “look closer”.</p>
          <div className="mt-4 space-y-3">
            {result.ruleFindings.map((f) => (
              <article key={f.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge severity={f.severity} />
                  <h3 className="font-medium">{f.title}</h3>
                </div>
                {f.excerpt && <p className="mt-2 text-sm italic text-zinc-600">{f.excerpt}</p>}
                <p className="mt-2 text-sm">{f.explanation}</p>
                <p className="mt-1 text-xs text-zinc-500">{f.legalBasis}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {result.missing.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">Missing protections</h2>
          <ul className="mt-3 space-y-2">
            {result.missing.map((m, i) => (
              <li key={i} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                <strong>{m.topic}.</strong> {m.why}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
