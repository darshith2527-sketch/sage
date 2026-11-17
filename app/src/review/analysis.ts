import { z } from "zod";
import { normalise } from "./extract";
import type { RuleFinding } from "./rules";

// What the AI must return. Every risk must quote the document word for word,
// so code can check that the AI is pointing at real text.
export const reviewSchema = z.object({
  documentType: z.string().describe("What kind of agreement this is, e.g. 'Freelance service agreement'"),
  summary: z.string().describe("2–3 plain sentences: what the agreement does and the overall balance of risk for the user"),
  risks: z
    .array(
      z.object({
        title: z.string().describe("Short name of the issue, e.g. 'Payment only on client satisfaction'"),
        quote: z
          .string()
          .describe("An EXACT, word-for-word excerpt from the document (10–40 words) showing the issue. Never paraphrase."),
        severity: z.enum(["high", "medium", "low"]),
        favours: z.string().describe("Which party this clause favours, e.g. 'Client', or 'Neither'"),
        explanation: z.string().describe("Why this is risky for the user, in 1–2 plain sentences"),
        suggestion: z.string().describe("A fairer alternative the user could ask for, in 1 sentence"),
      }),
    )
    .describe("Risky, unclear or one-sided clauses, most serious first"),
  missing: z
    .array(
      z.object({
        topic: z.string().describe("A protection this kind of agreement normally has, e.g. 'Limitation of liability'"),
        why: z.string().describe("Why its absence matters for the user, in 1 sentence"),
      }),
    )
    .describe("Important clauses that are missing"),
});

export type Review = z.infer<typeof reviewSchema>;
export type Risk = Review["risks"][number] & {
  verified: boolean;
  start?: number; // where the quote is in the normalised text
  end?: number;
  confirmedBy?: { title: string; legalBasis: string }[]; // code checks that flagged the same clause
};

export const REVIEW_INSTRUCTIONS = `You review agreements for people in India who are not lawyers.

Read the agreement and identify what could hurt the user, from the user's side of the deal.
- Judge clauses under Indian law. Examples of common problems: restraints on working or doing business after the contract (usually void under Contract Act s. 27), large fixed penalties (only reasonable compensation is recoverable under s. 74), payment that depends on one side's "satisfaction", no payment deadline, ownership of work passing before payment, copyright assignments without duration or territory (Copyright Act s. 19), unlimited liability, one-sided termination, no dispute resolution or no arbitration seat.
- For every risk, "quote" must be copied EXACTLY, word for word, from the agreement. Never paraphrase, summarise or join separate sentences in a quote.
- Only report real issues in this document. Don't invent problems, and don't repeat the same issue twice.
- Use plain English. Be balanced: if a clause is standard and fair, don't flag it.
- A risk is a clause that clearly disadvantages the user. A normal, fair clause that is only missing a detail (e.g. confidentiality without a definition) is not a risk: mention the missing detail under "missing" instead.
- Use "high" only for clauses that could cost the user a lot of money, rights or freedom. Use "low" sparingly.
- You give general information, not legal advice.`;

// Lower-cases and straightens quotes/dashes without changing the text's length,
// so a position found in the result is the same position in the normalised text.
function simplify(s: string): string {
  return s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
}

// Code check: a risk is verified only if its quote really appears in the document.
// Matching ignores spacing, line breaks, letter case and curly vs straight quotes.
// `doc` must be normalised text (see normalise()).
export function verifyRisks(doc: string, risks: Review["risks"]): Risk[] {
  const haystack = simplify(doc);
  return risks.map((risk) => {
    const quote = simplify(normalise(risk.quote)).replace(/^[."'…\s]+|[."'…\s]+$/g, "");
    const start = quote.length >= 8 ? haystack.indexOf(quote) : -1;
    return start === -1 ? { ...risk, verified: false } : { ...risk, verified: true, start, end: start + quote.length };
  });
}

// When a code check found the same clause the AI flagged, show it as a confirmation
// on the AI's card instead of a second card. Returns the code checks left over.
export function mergeFindings(risks: Risk[], findings: RuleFinding[]): RuleFinding[] {
  const rest: RuleFinding[] = [];
  for (const finding of findings) {
    const match =
      finding.start === undefined
        ? undefined
        : risks.find(
            (r) => r.verified && r.start !== undefined && r.start < finding.end! && finding.start! < r.end!,
          );
    if (match) {
      match.confirmedBy = [...(match.confirmedBy ?? []), { title: finding.title, legalBasis: finding.legalBasis }];
    } else {
      rest.push(finding);
    }
  }
  return rest;
}
