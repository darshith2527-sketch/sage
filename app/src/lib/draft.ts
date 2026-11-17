import { freelanceClauses } from "@/clauses/freelance";
import { PLACEHOLDERS, placeholdersIn, type Clause } from "@/clauses/types";
import type { Deal } from "@/lib/deal";

// One clause as it appears in the finished contract.
export type ContractClause = {
  number: number;
  id: string;
  title: string;
  text: string;
  plainExplanation: string;
};

export type Contract = {
  title: string;
  clientName: string;
  freelancerName: string;
  clauses: ContractClause[];
  blanks: string[]; // details the user must fill in by hand before signing
};

// The optional clauses a user can switch on, for the checkboxes on the page.
export const OPTIONAL_CLAUSES = freelanceClauses
  .filter((c) => c.include === "optional")
  .map((c) => ({ id: c.id, title: c.title, plainExplanation: c.plainExplanation }));

// Step 1: choose clauses. Required and standard always; optional only if chosen.
export function selectClauses(chosenOptional: string[]): Clause[] {
  return freelanceClauses.filter(
    (c) => c.include !== "optional" || chosenOptional.includes(c.id),
  );
}

// "2026-12-01" → "1 December 2026"
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const rupees = (n: number) => n.toLocaleString("en-IN");

// A visible marker for details the user must type in, e.g. "[Client's postal address]".
const blankMarker = (description: string) => `[${description}]`;

// Step 2: work out the value for every placeholder.
export function buildValues(deal: Deal, scopeText: string, today: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [name, source] of Object.entries(PLACEHOLDERS)) {
    if (source.from === "default") values[name] = source.value;
    if (source.from === "manual") values[name] = blankMarker(source.description);
  }

  values.clientName = deal.clientName ?? "";
  values.freelancerName = deal.freelancerName ?? "";
  values.scope = scopeText;
  values.totalFee = deal.totalFee !== null ? rupees(deal.totalFee) : "";
  values.startDate = deal.startDate ? formatDate(deal.startDate) : "";
  values.deadline = deal.deadline ? formatDate(deal.deadline) : "";
  values.revisionRounds = deal.revisionRounds !== null ? String(deal.revisionRounds) : "";
  values.jurisdictionCity = deal.jurisdictionCity ?? "";
  values.agreementDate = formatDate(today);
  values.milestoneSchedule = (deal.milestones ?? [])
    .map(
      (m, i) =>
        `${i + 1}. ${m.title}: ₹${m.amount !== null ? rupees(m.amount) : "?"}, ` +
        (m.dueDate ? `due by ${formatDate(m.dueDate)}` : "due on completion"),
    )
    .join("\n");

  return values;
}

// Step 3: replace every {{placeholder}} with its value.
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => values[name] ?? whole);
}

// Step 4: assemble the contract.
export function assembleContract(
  deal: Deal,
  scopeText: string,
  chosenOptional: string[],
  today: string,
): Contract {
  const values = buildValues(deal, scopeText, today);
  const clauses = selectClauses(chosenOptional).map((clause, i) => ({
    number: i + 1,
    id: clause.id,
    title: clause.title,
    text: fill(clause.text, values),
    plainExplanation: clause.plainExplanation,
  }));

  const blanks = Object.values(PLACEHOLDERS)
    .filter((source) => source.from === "manual")
    .map((source) => source.description)
    .filter((description) => clauses.some((c) => c.text.includes(blankMarker(description))));

  return {
    title: "Freelance Service Agreement",
    clientName: deal.clientName ?? "",
    freelancerName: deal.freelancerName ?? "",
    clauses,
    blanks,
  };
}

// Step 5: code checks on the finished contract.
export function checkContract(contract: Contract): string[] {
  const problems: string[] = [];

  for (const required of freelanceClauses.filter((c) => c.include === "required")) {
    if (!contract.clauses.some((c) => c.id === required.id)) {
      problems.push(`Required clause missing: ${required.title}`);
    }
  }
  for (const clause of contract.clauses) {
    if (placeholdersIn(clause.text).length > 0) {
      problems.push(`Unfilled detail in "${clause.title}"`);
    }
    if (/\{\{|\}\}/.test(clause.text)) {
      problems.push(`Broken placeholder in "${clause.title}"`);
    }
  }
  return problems;
}

// "Freelance-Agreement-Mehta-Traders"
export function contractFileName(contract: Contract): string {
  const client = contract.clientName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Freelance-Agreement${client ? `-${client}` : ""}`;
}
