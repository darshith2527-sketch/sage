// Checks the Know Your Rights library: `npm run check:rights`.
// Fails if any card is invalid, unregistered, missing a source or verification date,
// cites the repealed IPC/CrPC as current law, or has duplicate IDs.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cardSchema } from "../src/lib/rights/types";

async function main() {
const dir = join(__dirname, "../src/lib/rights/cards");
const problems: string[] = [];
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const where = `cards/${file}`;
  const parsed = cardSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) problems.push(`${where}: ${issue.path.join(".")} ${issue.message}`);
    continue;
  }
  const card = parsed.data;
  if (`${card.id}.json` !== file) problems.push(`${where}: id "${card.id}" must match the file name`);

  // Verification date must be a real date, not in the future, and not older than a year.
  const verified = new Date(card.last_verified);
  const ageDays = (Date.now() - verified.getTime()) / 86_400_000;
  if (Number.isNaN(verified.getTime())) problems.push(`${where}: last_verified is not a date`);
  else if (ageDays < -1) problems.push(`${where}: last_verified is in the future`);
  else if (ageDays > 365) problems.push(`${where}: last verified over a year ago — re-check the law`);

  card.rights.forEach((right, i) => {
    const at = `${where}: rights[${i}] (${right.act} ${right.section})`;
    if (!right.source_url) problems.push(`${at}: missing source_url`);
    // Old criminal laws may only appear in brackets as old_section, never as the current law.
    if (/Indian Penal Code|Code of Criminal Procedure|\bIPC\b|\bCrPC\b/i.test(`${right.act} ${right.section}`)) {
      problems.push(`${at}: cites IPC/CrPC as current law; use BNS/BNSS and put the old number in old_section`);
    }
  });
  if (card.emergency && !card.helplines.some((h) => h.number === "112")) {
    problems.push(`${where}: emergency card must list helpline 112`);
  }
}

// Load the library only once every file is valid (loading throws on a bad card).
if (problems.length) return report(problems);
const { RIGHTS_CARDS } = await import("../src/lib/rights");
const registered = new Set(RIGHTS_CARDS.map((c) => c.id));
for (const file of files) {
  if (!registered.has(file.replace(/\.json$/, ""))) problems.push(`cards/${file}: not imported in src/lib/rights/index.ts`);
}
const ids = RIGHTS_CARDS.map((c) => c.id);
for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) problems.push(`duplicate card id: ${id}`);
if (RIGHTS_CARDS.length !== files.length) problems.push(`index.ts registers ${RIGHTS_CARDS.length} cards but cards/ has ${files.length}`);

if (problems.length) return report(problems);
const sections = RIGHTS_CARDS.reduce((n, c) => n + c.rights.length, 0);
console.log(`✓ ${RIGHTS_CARDS.length} situation cards, ${sections} legal references, all sourced and dated.`);
}

function report(problems: string[]) {
  console.error(`✗ ${problems.length} problem(s) in the rights library:\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

main();
