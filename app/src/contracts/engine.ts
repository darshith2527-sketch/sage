import { placeholdersIn, type Clause, type ContractType, type DealValues, type FieldDef } from "./types";

// ---------- Formatting ----------

// "2026-12-01" → "1 December 2026"
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// 60000 → "60,000" (Indian grouping: 1,00,000)
export const rupees = (n: number) => n.toLocaleString("en-IN");

export function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

// How a field's value reads inside contract text.
export function formatForContract(field: FieldDef, value: unknown): string {
  if (isEmpty(value)) return "";
  switch (field.kind) {
    case "money":
      return rupees(Number(value));
    case "date":
      return formatDate(String(value));
    case "choice":
      return field.choices?.[String(value)] ?? String(value);
    case "list":
      return (value as unknown[]).map((item) => field.formatItem?.(item) ?? String(item)).join("\n");
    default:
      return String(value);
  }
}

// How a field's value is shown in the "Deal so far" panel. null = not filled yet.
export function formatForPanel(field: FieldDef, value: unknown): string | string[] | null {
  if (isEmpty(value)) return null;
  if (field.kind === "money") return `₹${rupees(Number(value))}`;
  if (field.kind === "list") {
    return (value as unknown[]).map((item) => field.formatItem?.(item) ?? String(item));
  }
  return formatForContract(field, value);
}

// ---------- Deals ----------

export function emptyDeal(type: ContractType): DealValues {
  return Object.fromEntries(type.fields.map((f) => [f.key, null]));
}

// Apply an update from the AI: only non-empty values overwrite what we have.
// (null from the AI means "no news", not "erase".)
export function mergeDeal(type: ContractType, deal: DealValues, update: DealValues): DealValues {
  const next = { ...deal };
  for (const { key } of type.fields) {
    if (!isEmpty(update[key])) next[key] = update[key];
  }
  return next;
}

// Code checks: which required fields are empty, and any type-specific problems.
export function checkDeal(type: ContractType, deal: DealValues) {
  const missing = type.fields.filter((f) => f.required && isEmpty(deal[f.key])).map((f) => f.label);
  return { missing, problems: type.validate(deal) };
}

// ---------- Contracts ----------

export type ContractClause = {
  number: number;
  id: string;
  title: string;
  text: string;
  plainExplanation: string;
};

export type Contract = {
  title: string;
  parties: { role: string; name: string }[];
  clauses: ContractClause[];
  blanks: string[]; // details the user must fill in by hand before signing
};

// Step 1: choose clauses. Optional ones only if ticked; "onlyIf" ones only if the deal matches.
export function selectClauses(type: ContractType, deal: DealValues, chosenOptional: string[]): Clause[] {
  return type.clauses.filter((c) => {
    if (c.include === "optional" && !chosenOptional.includes(c.id)) return false;
    if (c.onlyIf && deal[c.onlyIf.field] !== c.onlyIf.equals) return false;
    return true;
  });
}

const blankMarker = (description: string) => `[${description}]`;

// Step 2: a value for every placeholder.
export function buildValues(
  type: ContractType,
  deal: DealValues,
  today: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  const values: Record<string, string> = { agreementDate: formatDate(today) };

  for (const [name, source] of Object.entries(type.placeholders)) {
    if (source.from === "default") values[name] = source.value;
    if (source.from === "manual") values[name] = blankMarker(source.description);
    if (source.from === "deal") {
      const field = type.fields.find((f) => f.key === source.field);
      if (field) values[name] = formatForContract(field, deal[source.field]);
    }
  }
  return { ...values, ...type.derived(deal), ...overrides };
}

// Step 3: replace every {{placeholder}} with its value.
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => values[name] ?? whole);
}

// Step 4: assemble the contract.
export function assembleContract(
  type: ContractType,
  deal: DealValues,
  chosenOptional: string[],
  today: string,
  overrides: Record<string, string> = {},
): Contract {
  const values = buildValues(type, deal, today, overrides);
  const clauses = selectClauses(type, deal, chosenOptional).map((clause, i) => ({
    number: i + 1,
    id: clause.id,
    title: clause.title,
    text: fill(clause.text, values),
    plainExplanation: clause.plainExplanation,
  }));

  const blanks = Object.values(type.placeholders)
    .filter((source) => source.from === "manual")
    .map((source) => source.description)
    .filter((description) => clauses.some((c) => c.text.includes(blankMarker(description))));

  return { title: type.name, parties: type.parties(deal), clauses, blanks };
}

// Step 5: code checks on the finished contract.
export function checkContract(type: ContractType, contract: Contract): string[] {
  const problems: string[] = [];
  for (const required of type.clauses.filter((c) => c.include === "required" && !c.onlyIf)) {
    if (!contract.clauses.some((c) => c.id === required.id)) {
      problems.push(`Required clause missing: ${required.title}`);
    }
  }
  for (const clause of contract.clauses) {
    if (placeholdersIn(clause.text).length > 0 || /\{\{|\}\}/.test(clause.text)) {
      problems.push(`Unfilled detail in "${clause.title}"`);
    }
  }
  return problems;
}

// "Freelance-Service-Agreement-Mehta-Traders"
export function contractFileName(contract: Contract): string {
  const slug = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const first = contract.parties[0]?.name ?? "";
  return [slug(contract.title), slug(first)].filter(Boolean).join("-");
}
