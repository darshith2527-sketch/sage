import { getRightsCard } from "./index";

// Code checks on the AI, shared by the API route, the page and the tests.

export type ShowRightsResult = {
  shown: string[]; // card IDs that exist; only these are rendered
  rejected: string[]; // IDs the AI made up; never rendered
  userAtFault: boolean | null;
  clarifyingQuestion: string | null;
};

// Keep only real card IDs (max 3), dropping duplicates and anything invented.
export function checkCardIds(
  cardIds: string[],
  userAtFault: boolean | null,
  clarifyingQuestion: string | null,
): ShowRightsResult {
  const unique = [...new Set(cardIds.map((id) => id.trim()))];
  return {
    shown: unique.filter((id) => getRightsCard(id)).slice(0, 3),
    rejected: unique.filter((id) => !getRightsCard(id)),
    userAtFault,
    clarifyingQuestion,
  };
}

// The AI is told never to type legal citations; this is the safety net if it does.
// Section/article numbers in the AI's own words are replaced, so every citation a user
// sees comes from the verified library cards.
// "of the Motor Vehicles Act, 1988" etc. after a section number is removed with it.
const OF_ACT = String.raw`(?:\s+of\s+(?:the\s+)?[A-Z][\w.]*(?:\s+[A-Z][\w.]*)*(?:,?\s+\d{4})?)?`;
const CITATION = new RegExp(
  [
    String.raw`\b(?:u\/s|sec(?:tion)?s?\.?|s\.)\s*\d+[A-Z]?(?:\s*\(\w+\))*` + OF_ACT,
    String.raw`\b(?:art(?:icle)?s?\.?)\s*\d+[A-Z]?(?:\s*\(\w+\))*` + OF_ACT,
    String.raw`\b(?:IPC|CrPC|BNSS?|BSA)\s*(?:s\.?\s*)?\d+[A-Z]?`,
    String.raw`\brule\s*\d+[A-Z]?` + OF_ACT,
  ].join("|"),
  "gi",
);
const HAS_CITATION = new RegExp(CITATION.source, "i"); // no "g": safe to .test() repeatedly

export function stripCitations(text: string): string {
  return text
    .replace(/\(([^()]*?)\)/g, (whole, inner: string) => (HAS_CITATION.test(inner) ? "" : whole)) // drop "(Section 130 says so)"
    .replace(CITATION, "the law shown below")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/ {2,}/g, " ");
}
