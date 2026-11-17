import type { z } from "zod";

// ---------- Clauses ----------

// How a clause gets into a contract.
// - "required": must be in every contract of this type. Code checks this.
// - "standard": included by default; the user may remove it.
// - "optional": only included when the user ticks it.
export type Inclusion = "required" | "standard" | "optional";

export type Clause = {
  id: string; // permanent label, e.g. "FSA-PAY-01"
  category: string; // one word, used to group and find clauses
  title: string; // heading shown in the contract
  include: Inclusion;
  text: string; // the clause, with {{placeholders}} for deal details
  plainExplanation: string; // shown to the user beside the clause
  riskNotes: string; // what goes wrong if this clause is missing or weak
  legalBasis: string; // the law it relates to, checked against the bare Act
  // Only include this clause when a deal field has a certain value,
  // e.g. { field: "ndaKind", equals: "mutual" }.
  onlyIf?: { field: string; equals: string | number | boolean };
};

// Where each {{placeholder}}'s value comes from.
// - "deal": filled from the chat intake (must match a field key)
// - "derived": calculated by code, e.g. today's date or a schedule
// - "default": a sensible standard value the user can change
// - "manual": the user types it in before signing
export type PlaceholderSource =
  | { from: "deal"; field: string }
  | { from: "derived"; description: string }
  | { from: "default"; value: string; description: string }
  | { from: "manual"; description: string };

// Finds every {{placeholder}} name used in a piece of text.
export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
}

// ---------- Deals (what the chat intake collects) ----------

// A deal is just field names → values. Each agreement type defines its own fields.
export type DealValues = Record<string, unknown>;

// How a field is shown and formatted.
export type FieldKind = "text" | "number" | "money" | "date" | "choice" | "list";

export type FieldDef = {
  key: string; // must match a key in the type's schema
  label: string; // shown in the "Deal so far" panel
  kind: FieldKind;
  required: boolean; // drafting is blocked until required fields are filled
  choices?: Record<string, string>; // for "choice": stored value → label shown
  formatItem?: (item: unknown) => string; // for "list": how one item is shown
};

// ---------- Agreement types ----------

export type ContractType = {
  id: string; // used in the URL, e.g. "freelance" → /draft/freelance
  name: string; // full title, e.g. "Freelance Service Agreement"
  shortName: string; // e.g. "Freelance"
  description: string; // one line shown on the home page
  idPrefix: string; // clause ID prefix, e.g. "FSA"
  example: string; // the "Try an example" message

  schema: z.ZodType<DealValues>; // what the AI may fill in (every field nullable)
  fields: FieldDef[];
  intakeInstructions: string; // the chat AI's job description for this type

  clauses: Clause[];
  placeholders: Record<string, PlaceholderSource>;

  // Type-specific checks, e.g. "milestones must add up to the fee".
  validate: (deal: DealValues) => string[];
  // Values for "derived" placeholders, e.g. a milestone schedule.
  derived: (deal: DealValues) => Record<string, string>;
  // Who signs, in order. The first party's name is used in the file name.
  parties: (deal: DealValues) => { role: string; name: string }[];

  // Optional: one AI step that rewrites a single field into a clear list,
  // e.g. turning a scope sentence into deliverables. The AI never writes clauses.
  refine?: {
    placeholder: string; // which placeholder the result replaces
    instructions: string;
    prompt: (deal: DealValues) => string;
  };
};
