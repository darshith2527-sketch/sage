"use client";

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

// Coloured left edge for each risk card.
const TEXT: Record<Risk["severity"], string> = {
  high: "text-high",
  medium: "text-medium",
  low: "text-low",
};

const EDGE: Record<Risk["severity"], string> = {
  high: "border-l-high",
  medium: "border-l-medium",
  low: "border-l-low",
};

function Badge({ severity }: { severity: Risk["severity"] }) {
  return <span className={`badge badge-${severity}`}>{severity}</span>;
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
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 md:px-8 md:pt-28">
      <p className="kicker">02 / Review</p>
      <h1 className="display extrude mt-2 text-5xl font-[800] text-ink md:text-6xl">
        Review an <span className="script ml-1 inline-block -rotate-3 text-[1.25em]">agreement</span>
      </h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Upload or paste any agreement. Sage flags risky and one-sided clauses and explains them in plain words.
      </p>

      <div className="mt-6 border border-medium/40 bg-medium/10 p-4 text-sm leading-relaxed text-ink">
        <strong className="text-medium">Don&apos;t upload confidential documents.</strong> This demo sends text to an
        AI provider that may use it to improve its models. Use the sample, or an agreement with personal details
        removed.
      </div>

      <section className="hud mt-6 space-y-5 p-6 md:p-8">
        <div>
          <label className="kicker block" htmlFor="file">
            Upload a PDF, Word (.docx) or text file
          </label>
          <input
            id="file"
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="field mt-2 block p-2 text-sm"
          />
        </div>

        <div>
          <label className="kicker block" htmlFor="text">
            …or paste the text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={file !== null}
            rows={8}
            placeholder="Paste the agreement here"
            className="field scroll-thin mt-2 leading-relaxed"
          />
          <div className="mt-2 flex gap-5">
            <button type="button" onClick={loadSample} className="text-sm text-accent hover:text-ink">
              Try a sample one-sided agreement
            </button>
            <button type="button" onClick={clearAll} className="text-sm text-ink-faint hover:text-ink">
              Clear
            </button>
          </div>
        </div>

        <div>
          <label className="kicker block" htmlFor="side">
            Which side are you on? (optional)
          </label>
          <input
            id="side"
            value={side}
            onChange={(e) => setSide(e.target.value)}
            placeholder="e.g. I'm the freelancer / the tenant / the borrower"
            className="field mt-2"
          />
        </div>

        <button type="button" onClick={review} disabled={!canReview} className="btn btn-primary">
          {busy ? "Reviewing… (up to a minute)" : "Review agreement"}
        </button>
        {busy && (
          <div className="h-0.5 overflow-hidden bg-line/30">
            <div className="h-full w-1/3 animate-[scan_1.6s_ease-in-out_infinite] bg-accent shadow-[0_0_10px_var(--glow)]" />
          </div>
        )}
        {error && <p className="text-sm text-high">{error}</p>}
      </section>

      <div ref={resultRef} className="scroll-mt-24">
        {result && <ReviewView result={result} />}
      </div>

    </main>
  );
}

function ReviewView({ result }: { result: ReviewResult }) {
  const counts = (["high", "medium", "low"] as const).map((s) => ({
    severity: s,
    count: result.risks.filter((r) => r.severity === s).length,
  }));
  return (
    <section className="mt-10 space-y-10" data-testid="review-result">
      <div className="hud hud-strong p-6 md:p-8">
        <p className="mb-4 truncate text-xs text-ink-faint" title={result.firstLine}>
          Reviewed: {result.source} — “{result.firstLine}”
        </p>
        <p className="kicker">{result.documentType}</p>
        <p className="mt-3 leading-relaxed text-ink">{result.summary}</p>
        {result.truncated && (
          <p className="mt-3 text-sm text-medium">This document was long, so only the first part was reviewed.</p>
        )}
        {/* Risk summary */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {counts.map(({ severity, count }) => (
            <div key={severity} className="border border-line bg-white/[0.03] p-3 text-center">
              <p className={`display text-3xl ${count ? TEXT[severity] : "text-ink-faint"}`}>{count}</p>
              <p className="kicker mt-1 text-[0.65rem] text-ink-faint">{severity} risk</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="display text-3xl text-ink">Risks found ({result.risks.length})</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Every quote below was checked word for word against your document.
          {result.unverifiedCount > 0 &&
            ` ${result.unverifiedCount} more flag${result.unverifiedCount === 1 ? "" : "s"} couldn't be matched to the text and ${result.unverifiedCount === 1 ? "was" : "were"} hidden.`}
        </p>
        <div className="mt-5 space-y-4">
          {result.risks.map((risk, i) => (
            <article
              key={i}
              className={`border border-l-4 border-line bg-[rgba(14,34,82,0.45)] p-5 backdrop-blur-md ${EDGE[risk.severity]}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge severity={risk.severity} />
                <h3 className="display text-xl text-ink">{risk.title}</h3>
                <span className="text-xs text-ink-faint">Favours: {risk.favours}</span>
              </div>
              <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm italic leading-relaxed text-ink-muted">
                “{risk.quote}”
              </blockquote>
              <p className="mt-3 text-sm leading-relaxed text-ink">{risk.explanation}</p>
              <p className="mt-2 text-sm leading-relaxed text-ok">
                <strong>Ask for:</strong> {risk.suggestion}
              </p>
              {risk.confirmedBy?.map((c) => (
                <p key={c.title} className="mt-3 inline-block border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
                  ✓ Also caught by Sage&apos;s Indian-law check: {c.title} ({c.legalBasis})
                </p>
              ))}
            </article>
          ))}
        </div>
      </div>

      {result.ruleFindings.length > 0 && (
        <div>
          <h2 className="display text-3xl text-ink">
            {result.risks.some((r) => r.confirmedBy) ? "More Indian-law checks" : "Indian-law checks"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Fixed rules run by code, not AI. A match means “look closer”.</p>
          <div className="mt-5 space-y-3">
            {result.ruleFindings.map((f) => (
              <article key={f.id} className={`border border-l-4 border-line bg-white/[0.03] p-4 ${EDGE[f.severity]}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge severity={f.severity} />
                  <h3 className="display text-lg text-ink">{f.title}</h3>
                </div>
                {f.excerpt && <p className="mt-2 text-sm italic text-ink-muted">{f.excerpt}</p>}
                <p className="mt-2 text-sm text-ink">{f.explanation}</p>
                <p className="kicker mt-2 text-[0.65rem] text-ink-faint">{f.legalBasis}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {result.missing.length > 0 && (
        <div>
          <h2 className="display text-3xl text-ink">Missing protections</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {result.missing.map((m, i) => (
              <li key={i} className="hud p-4 text-sm leading-relaxed [--cut:10px]">
                <span className="display block text-lg text-ink">{m.topic}</span>
                <span className="text-ink-muted">{m.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
