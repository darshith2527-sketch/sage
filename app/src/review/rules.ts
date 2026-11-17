// Indian-law checks done in plain code, without AI. They look for wording that is
// commonly risky under Indian law, so they give the same answer every time.
// A match means "worth a closer look", not "definitely illegal".

export type RuleFinding = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  explanation: string;
  legalBasis: string;
  excerpt?: string; // the matching text, when the rule found something in the document
  start?: number; // where the match is in the normalised text, used to merge with AI flags
  end?: number;
};

type Rule = {
  id: string;
  title: string;
  severity: RuleFinding["severity"];
  explanation: string;
  legalBasis: string;
  // "present": flag when the pattern IS found. "absent": flag when it ISN'T.
  when: "present" | "absent";
  pattern: RegExp;
  onlyIf?: RegExp; // for "absent" rules: only check when this IS present
};

// Verbs that describe working or doing business, used by the non-compete rule.
const RESTRAINT =
  "(?:compet\\w*|engage in|work (?:for|with)|be employed|join|provide (?:any |similar |the same )?(?:\\w+ )?services)";

const RULES: Rule[] = [
  {
    id: "non-compete",
    title: "Possible non-compete restriction",
    severity: "high",
    when: "present",
    // Catches "non-compete", and "shall not work for…" with "after/following" on either side of it.
    pattern: new RegExp(
      [
        "non[-\\s]?compet\\w*",
        `shall not[^.]{0,80}${RESTRAINT}[^.]{0,120}(?:after|following|for a period)`,
        `(?:after|following)[^.]{0,120}shall not[^.]{0,80}${RESTRAINT}`,
      ].join("|"),
      "i",
    ),
    explanation:
      "Clauses that stop someone from working or doing business after the contract ends are generally void in India. Restrictions during the contract can be valid.",
    legalBasis: "Indian Contract Act, 1872, s. 27",
  },
  {
    id: "penalty",
    title: "Penalty or fixed damages",
    severity: "medium",
    when: "present",
    pattern: /penalt(?:y|ies)|liquidated damages/i,
    explanation:
      "Indian courts award only reasonable compensation for a breach, up to the stated amount. A large fixed penalty may be reduced, but it can still be used as pressure.",
    legalBasis: "Indian Contract Act, 1872, s. 74",
  },
  {
    id: "unlimited-liability",
    title: "Unlimited liability",
    severity: "high",
    when: "present",
    pattern: /unlimited liabilit\w*|liabilit\w* (?:shall be |is )?(?:unlimited|without (?:any )?limit)/i,
    explanation: "Liability without a cap can expose one side to claims far larger than the contract's value.",
    legalBasis: "Indian Contract Act, 1872, s. 73 (compensation for breach)",
  },
  {
    id: "terminate-without-notice",
    title: "Termination at any time or without notice",
    severity: "medium",
    when: "present",
    pattern: /terminat\w*[^.]{0,100}(?:at any time|without (?:any )?(?:prior )?(?:notice|cause|reason))/i,
    explanation:
      "Check whether both sides have the same right, with the same notice, and whether money already earned or paid must still be settled when the agreement ends.",
    legalBasis: "Indian Contract Act, 1872, s. 70 (payment for benefits received)",
  },
  {
    id: "sole-discretion",
    title: "Decisions at one side's sole discretion",
    severity: "low",
    when: "present",
    pattern: /(?:sole|absolute) discretion/i,
    explanation: "One side can decide alone. Check whether this affects payment, approval or termination.",
    legalBasis: "General contract principles",
  },
  {
    id: "arbitration-no-seat",
    title: "Arbitration without a seat",
    severity: "medium",
    when: "absent",
    onlyIf: /arbitrat/i,
    pattern: /\b(?:seat|venue|place) of (?:the )?arbitration|arbitration shall be (?:held|conducted) (?:in|at)/i,
    explanation:
      "The agreement mentions arbitration but doesn't seem to name where it takes place. This can cause a separate dispute about which courts supervise it.",
    legalBasis: "Arbitration and Conciliation Act, 1996, s. 20",
  },
  {
    id: "no-governing-law",
    title: "No governing law",
    severity: "low",
    when: "absent",
    pattern: /govern\w* (?:by|in accordance with)[^.]{0,40}laws?|governing law/i,
    explanation: "The agreement doesn't seem to say which country's law applies.",
    legalBasis: "General contract principles",
  },
];

// Runs every rule over the document text. Pass normalised text (see normalise())
// so positions line up with the AI quotes.
export function runRules(text: string): RuleFinding[] {
  const findings: RuleFinding[] = [];
  for (const rule of RULES) {
    if (rule.onlyIf && !rule.onlyIf.test(text)) continue;
    const match = text.match(rule.pattern);
    const flagged = rule.when === "present" ? Boolean(match) : !match;
    if (!flagged) continue;
    findings.push({
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      explanation: rule.explanation,
      legalBasis: rule.legalBasis,
      ...(rule.when === "present" && match
        ? {
            excerpt: excerptAround(text, match.index ?? 0, match[0].length),
            start: match.index ?? 0,
            end: (match.index ?? 0) + match[0].length,
          }
        : {}),
    });
  }
  return findings;
}

// Up to ~200 characters around a match, cut at word boundaries.
function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, index - 60)));
  const end = Math.min(text.length, text.indexOf(" ", index + length + 80) === -1 ? text.length : text.indexOf(" ", index + length + 80));
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}
