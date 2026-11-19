import { z } from "zod";

// A "situation card": everything Sage may say about one real-life situation.
// Every legal reference lives here, written and checked by people. The AI only
// picks card IDs; the citations users see are rendered from these files.

export const CATEGORIES = [
  "traffic",
  "police",
  "tenant",
  "consumer",
  "workplace",
  "womens-safety",
  "cyber",
  "legal-aid",
] as const;

const httpsUrl = z.string().url().startsWith("https://");

export const rightSchema = z.object({
  act: z.string().min(3), // e.g. "Bharatiya Nagarik Suraksha Sanhita, 2023"
  section: z.string().min(1), // e.g. "s.47" or "Art. 22(1)"
  old_section: z.string().optional(), // the pre-2024 number, e.g. "CrPC s.50"
  plain_explanation: z.string().min(10),
  source_url: httpsUrl, // official text the section was checked against
});

export const cardSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  category: z.enum(CATEGORIES),
  triggers: z.array(z.string().min(3)).min(2), // example phrases people use
  rights: z.array(rightSchema).min(1),
  do_now: z.array(z.string().min(5)).min(2).max(5),
  user_at_fault_cases: z.array(z.string().min(5)), // when the law is against the user
  escalation: z
    .array(z.object({ label: z.string(), detail: z.string(), url: httpsUrl.optional() }))
    .min(1),
  helplines: z.array(z.object({ name: z.string(), number: z.string().regex(/^[0-9-]{3,13}$/) })),
  emergency: z.boolean().default(false), // lead with 112 when this card applies
  notes: z.string().optional(), // honest limits, e.g. "rules vary by state"
  last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Right = z.infer<typeof rightSchema>;
export type SituationCard = z.infer<typeof cardSchema>;
