// Checks the clause library for mistakes. Run with: npm run check:clauses
// Exits with an error if anything is wrong, so problems can't slip through.

import { freelanceClauses } from "../src/clauses/freelance";
import { PLACEHOLDERS, placeholdersIn, type Clause } from "../src/clauses/types";

const errors: string[] = [];
const warnings: string[] = [];

function check(clauses: Clause[], prefix: string) {
  const seenIds = new Set<string>();
  const usedPlaceholders = new Set<string>();

  for (const clause of clauses) {
    const where = clause.id || "(clause with no id)";

    // 1. IDs: right format, no duplicates.
    if (!new RegExp(`^${prefix}-[A-Z]+-\\d{2}$`).test(clause.id)) {
      errors.push(`${where}: id should look like ${prefix}-ABC-01`);
    }
    if (seenIds.has(clause.id)) errors.push(`${where}: duplicate id`);
    seenIds.add(clause.id);

    // 2. No empty fields.
    for (const field of ["category", "title", "text", "plainExplanation", "riskNotes", "legalBasis"] as const) {
      if (!clause[field].trim()) errors.push(`${where}: "${field}" is empty`);
    }

    // 3. Every placeholder must be registered in PLACEHOLDERS.
    for (const name of placeholdersIn(clause.text)) {
      usedPlaceholders.add(name);
      if (!(name in PLACEHOLDERS)) {
        errors.push(`${where}: unknown placeholder {{${name}}}. Add it to PLACEHOLDERS or fix the spelling.`);
      }
    }

    // 4. Catch broken placeholder syntax, like {name} or {{name} or {{ name }}.
    const leftover = clause.text.replace(/\{\{\w+\}\}/g, "");
    if (/[{}]/.test(leftover)) {
      errors.push(`${where}: broken placeholder brackets. Use exactly {{name}}.`);
    }

    // 5. Indian-law guard: non-compete clauses are void under Contract Act s. 27.
    if (/non-?compet/i.test(clause.text)) {
      errors.push(`${where}: contains a non-compete, which is void in India (Contract Act s. 27).`);
    }

    // 6. Explanations are for non-lawyers: keep them short.
    if (clause.plainExplanation.length > 220) {
      warnings.push(`${where}: plain explanation is long (${clause.plainExplanation.length} chars).`);
    }

    // 7. References to other clauses must point to a real clause title.
    for (const match of clause.text.matchAll(/the "([^"]+)" clause/g)) {
      if (!clauses.some((c) => c.title === match[1])) {
        errors.push(`${where}: refers to the "${match[1]}" clause, which doesn't exist.`);
      }
    }
  }

  // 8. The contract type needs at least one required clause.
  if (!clauses.some((c) => c.include === "required")) {
    errors.push(`${prefix}: no required clauses`);
  }

  // 9. Registered placeholders nobody uses are probably leftovers.
  for (const name of Object.keys(PLACEHOLDERS)) {
    if (!usedPlaceholders.has(name)) warnings.push(`placeholder {{${name}}} is never used`);
  }

  const counts = { required: 0, standard: 0, optional: 0 };
  for (const c of clauses) counts[c.include]++;
  console.log(
    `${prefix}: ${clauses.length} clauses (${counts.required} required, ${counts.standard} standard, ${counts.optional} optional)`,
  );
}

check(freelanceClauses, "FSA");

for (const w of warnings) console.log(`⚠  ${w}`);
for (const e of errors) console.log(`✗  ${e}`);

if (errors.length > 0) {
  console.log(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log("\n✓ All clauses look good.");
