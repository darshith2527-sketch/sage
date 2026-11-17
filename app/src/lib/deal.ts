import { z } from "zod";

// One payment stage of the project.
export const milestoneSchema = z.object({
  title: z.string().describe("Short name of the milestone, e.g. 'Wireframes'"),
  amount: z
    .number()
    .nullable()
    .describe("Payment for this milestone in INR as a plain number, or null if not stated"),
  dueDate: z
    .string()
    .nullable()
    .describe("Due date as YYYY-MM-DD, or null if not stated"),
});

// What the AI is allowed to fill in. Every field is nullable:
// the AI sends null for anything the user hasn't told it yet.
export const dealSchema = z.object({
  clientName: z.string().nullable().describe("Name of the client person or business"),
  freelancerName: z.string().nullable().describe("Name of the freelancer"),
  scope: z
    .string()
    .nullable()
    .describe("What exactly will be delivered, in one or two plain sentences"),
  totalFee: z.number().nullable().describe("Total fee in INR as a plain number"),
  milestones: z
    .array(milestoneSchema)
    .nullable()
    .describe("The complete current list of milestones. Send the whole list every time it changes."),
  startDate: z.string().nullable().describe("Start date as YYYY-MM-DD"),
  deadline: z.string().nullable().describe("Final deadline as YYYY-MM-DD"),
  revisionRounds: z
    .number()
    .nullable()
    .describe("Number of revision rounds included in the fee"),
  jurisdictionCity: z
    .string()
    .nullable()
    .describe("City whose courts will handle disputes, e.g. 'Bengaluru'"),
});

export type Deal = z.infer<typeof dealSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;

// Labels shown in the form, in display order.
export const FIELDS: { key: keyof Deal; label: string }[] = [
  { key: "clientName", label: "Client" },
  { key: "freelancerName", label: "Freelancer" },
  { key: "scope", label: "Scope of work" },
  { key: "totalFee", label: "Total fee" },
  { key: "milestones", label: "Milestones" },
  { key: "startDate", label: "Start date" },
  { key: "deadline", label: "Deadline" },
  { key: "revisionRounds", label: "Revision rounds" },
  { key: "jurisdictionCity", label: "Jurisdiction" },
];

export const emptyDeal: Deal = {
  clientName: null,
  freelancerName: null,
  scope: null,
  totalFee: null,
  milestones: null,
  startDate: null,
  deadline: null,
  revisionRounds: null,
  jurisdictionCity: null,
};

// Apply an update from the AI: only non-null values overwrite what we have.
export function mergeDeal(deal: Deal, update: Partial<Deal>): Deal {
  const next = { ...deal };
  for (const { key } of FIELDS) {
    const value = update[key];
    if (value !== null && value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

// Checks done in plain code, not by the AI, so they're right every time.
export function checkDeal(deal: Deal): { missing: string[]; problems: string[] } {
  const missing = FIELDS.filter(({ key }) => {
    const value = deal[key];
    return value === null || (Array.isArray(value) && value.length === 0);
  }).map(({ label }) => label);

  const problems: string[] = [];
  const milestones = deal.milestones ?? [];

  if (milestones.some((m) => m.amount === null)) {
    problems.push("Some milestones don't have a payment amount yet.");
  } else if (deal.totalFee !== null && milestones.length > 0) {
    const sum = milestones.reduce((total, m) => total + (m.amount ?? 0), 0);
    if (sum !== deal.totalFee) {
      problems.push(
        `Milestone payments add up to ₹${sum.toLocaleString("en-IN")}, but the total fee is ₹${deal.totalFee.toLocaleString("en-IN")}.`,
      );
    }
  }

  // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
  if (deal.startDate && deal.deadline && deal.deadline < deal.startDate) {
    problems.push("The deadline is before the start date.");
  }
  if (deal.deadline && milestones.some((m) => m.dueDate && m.dueDate > deal.deadline!)) {
    problems.push("A milestone is due after the final deadline.");
  }

  return { missing, problems };
}
