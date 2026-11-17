import { z } from "zod";
import { formatDate, rupees } from "../engine";
import type { ContractType, DealValues } from "../types";
import { freelanceClauses } from "./clauses";

// ---------- What the chat collects ----------

const milestoneSchema = z.object({
  title: z.string().describe("Short name of the milestone, e.g. 'Wireframes'"),
  amount: z
    .number()
    .nullable()
    .describe("Payment for this milestone in INR as a plain number, or null if not stated"),
  dueDate: z.string().nullable().describe("Due date as YYYY-MM-DD, or null if not stated"),
});

// Every field is nullable: the AI sends null for anything not mentioned yet.
const schema = z.object({
  clientName: z.string().nullable().describe("Name of the client person or business"),
  freelancerName: z.string().nullable().describe("Name of the freelancer"),
  scope: z.string().nullable().describe("What exactly will be delivered, in one or two plain sentences"),
  totalFee: z.number().nullable().describe("Total fee in INR as a plain number"),
  milestones: z
    .array(milestoneSchema)
    .nullable()
    .describe("The complete current list of milestones. Send the whole list every time it changes."),
  startDate: z.string().nullable().describe("Start date as YYYY-MM-DD"),
  deadline: z.string().nullable().describe("Final deadline as YYYY-MM-DD"),
  revisionRounds: z.number().nullable().describe("Number of revision rounds included in the fee"),
  jurisdictionCity: z
    .string()
    .nullable()
    .describe("City whose courts will handle disputes, e.g. 'Bengaluru'"),
});

type Deal = z.infer<typeof schema>;
type Milestone = z.infer<typeof milestoneSchema>;

function formatMilestone(item: unknown): string {
  const m = item as Milestone;
  return [m.title, m.amount !== null ? `₹${rupees(m.amount)}` : null, m.dueDate ? `by ${formatDate(m.dueDate)}` : null]
    .filter(Boolean)
    .join(" · ");
}

// ---------- The agreement type ----------

export const freelance: ContractType = {
  id: "freelance",
  name: "Freelance Service Agreement",
  shortName: "Freelance",
  description: "For freelancers and their clients: scope, milestone payments, ownership of work.",
  idPrefix: "FSA",
  example:
    "I'm designing a website for Mehta Traders. ₹60,000 in three stages: design, development and launch. Starting 1 December, done by end of January.",

  schema,
  fields: [
    { key: "clientName", label: "Client", kind: "text", required: true },
    { key: "freelancerName", label: "Freelancer", kind: "text", required: true },
    { key: "scope", label: "Scope of work", kind: "text", required: true },
    { key: "totalFee", label: "Total fee", kind: "money", required: true },
    { key: "milestones", label: "Milestones", kind: "list", required: true, formatItem: formatMilestone },
    { key: "startDate", label: "Start date", kind: "date", required: true },
    { key: "deadline", label: "Deadline", kind: "date", required: true },
    { key: "revisionRounds", label: "Revision rounds", kind: "number", required: true },
    { key: "jurisdictionCity", label: "Jurisdiction", kind: "text", required: true },
  ],

  intakeInstructions: `You are Sage, an assistant that helps Indian freelancers turn a deal into a freelance service agreement.

Your job right now is ONLY to collect the deal details. Do not write the contract yet.

Every time the user gives you new or changed details, call the updateDeal tool.
- Fill in only what the user actually said. Use null for anything you don't know. Never guess names, amounts or dates.
- Amounts are in Indian rupees as plain numbers (e.g. 60000, not "60k").
- Dates are YYYY-MM-DD. If the user gives a date without a year, assume the next upcoming one and don't ask about the year.
- For milestones, always send the complete list.

After updating, reply in 1–3 short, friendly sentences:
- Confirm what you understood. Write dates the way people say them, e.g. "1 December", not "2026-12-01".
- Ask about ONE or TWO missing details at a time, most important first: client name, freelancer name, scope, total fee, milestones with amounts, start date, deadline, revision rounds, jurisdiction city.
- If milestone amounts don't add up to the total fee, point it out and ask which is right.
- When everything is filled in, say the details are complete and the user can review them on the right.

Use simple English. No legal jargon. You don't give legal advice.`,

  clauses: freelanceClauses,

  placeholders: {
    // From the chat
    clientName: { from: "deal", field: "clientName" },
    freelancerName: { from: "deal", field: "freelancerName" },
    scope: { from: "deal", field: "scope" },
    totalFee: { from: "deal", field: "totalFee" },
    startDate: { from: "deal", field: "startDate" },
    deadline: { from: "deal", field: "deadline" },
    jurisdictionCity: { from: "deal", field: "jurisdictionCity" },
    // Calculated by code
    agreementDate: { from: "derived", description: "The date the contract is generated" },
    milestoneSchedule: { from: "derived", description: "Numbered list of milestones with amounts and due dates" },
    revisionRoundsText: { from: "derived", description: "e.g. '2 rounds'" },
    // Standard values the user can change
    paymentDueDays: { from: "default", value: "15", description: "Days to pay an invoice" },
    lateInterestRate: { from: "default", value: "12", description: "Yearly interest on late payments, in percent" },
    acceptanceDays: { from: "default", value: "7", description: "Days the client has to review a deliverable" },
    noticeDays: { from: "default", value: "15", description: "Notice period to end the contract without a reason" },
    cureDays: { from: "default", value: "15", description: "Days to fix a breach after being told about it" },
    confidentialityYears: { from: "default", value: "2", description: "Years confidentiality lasts after the contract ends" },
    forceMajeureDays: { from: "default", value: "30", description: "Days of delay after which either side can end the contract" },
    disputeTalkDays: { from: "default", value: "30", description: "Days to try resolving a dispute by talking first" },
    // Typed in by the user before signing
    clientAddress: { from: "manual", description: "Client's postal address" },
    freelancerAddress: { from: "manual", description: "Freelancer's postal address" },
    clientEmail: { from: "manual", description: "Client's email for notices" },
    freelancerEmail: { from: "manual", description: "Freelancer's email for notices" },
  },

  // Checks done in plain code, not by the AI, so they're right every time.
  validate(d: DealValues) {
    const deal = d as Deal;
    const problems: string[] = [];
    const milestones = deal.milestones ?? [];

    if (milestones.some((m) => m.amount === null)) {
      problems.push("Some milestones don't have a payment amount yet.");
    } else if (deal.totalFee !== null && deal.totalFee !== undefined && milestones.length > 0) {
      const sum = milestones.reduce((total, m) => total + (m.amount ?? 0), 0);
      if (sum !== deal.totalFee) {
        problems.push(
          `Milestone payments add up to ₹${rupees(sum)}, but the total fee is ₹${rupees(deal.totalFee)}.`,
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
    return problems;
  },

  derived(d: DealValues) {
    const deal = d as Deal;
    const rounds = deal.revisionRounds ?? 0;
    return {
      milestoneSchedule: (deal.milestones ?? [])
        .map(
          (m, i) =>
            `${i + 1}. ${m.title}: ₹${m.amount !== null ? rupees(m.amount) : "?"}, ` +
            (m.dueDate ? `due by ${formatDate(m.dueDate)}` : "due on completion"),
        )
        .join("\n"),
      revisionRoundsText: rounds === 1 ? "1 round" : `${rounds} rounds`,
    };
  },

  parties: (d: DealValues) => [
    { role: "Client", name: String(d.clientName ?? "") },
    { role: "Freelancer", name: String(d.freelancerName ?? "") },
  ],

  refine: {
    placeholder: "scope",
    instructions: `You turn a freelancer's description of their work into a clear list of deliverables for a contract.
Rules:
- Use only what the description says. Never add work, quantities, technologies or deadlines that aren't mentioned.
- 2 to 6 deliverables, each one short and specific.
- Plain English, no legal language, no prices or dates.`,
    prompt: (d: DealValues) => {
      const deal = d as Deal;
      return `Work description: ${deal.scope}\nMilestones: ${(deal.milestones ?? []).map((m) => m.title).join(", ")}`;
    },
  },
};
