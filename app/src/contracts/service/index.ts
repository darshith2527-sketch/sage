import { z } from "zod";
import { formatDate, rupees } from "../engine";
import type { ContractType, DealValues } from "../types";
import { serviceClauses } from "./clauses";

// ---------- What the chat collects ----------

const milestoneSchema = z.object({
  title: z.string().describe("Short name of the milestone, e.g. 'Campaign launch'"),
  amount: z.number().nullable().describe("Payment for this milestone in INR as a plain number, or null if not stated"),
  dueDate: z.string().nullable().describe("Due date as YYYY-MM-DD, or null if not stated"),
});

// Every field is nullable: the AI sends null for anything not mentioned yet.
const schema = z.object({
  clientName: z.string().nullable().describe("Name of the business receiving the services"),
  providerName: z.string().nullable().describe("Name of the business providing the services"),
  services: z.string().nullable().describe("What services will be provided, in one or two plain sentences"),
  paymentModel: z
    .enum(["fixed", "monthly"])
    .nullable()
    .describe("'fixed' for a total fee paid in milestones, 'monthly' for a monthly retainer"),
  totalFee: z.number().nullable().describe("Fixed model only: total fee in INR as a plain number"),
  milestones: z
    .array(milestoneSchema)
    .nullable()
    .describe("Fixed model only: the complete current list of milestones. Send the whole list every time it changes."),
  monthlyFee: z.number().nullable().describe("Monthly model only: fee per month in INR as a plain number"),
  startDate: z.string().nullable().describe("Start date as YYYY-MM-DD"),
  endDate: z.string().nullable().describe("End date as YYYY-MM-DD"),
  jurisdictionCity: z.string().nullable().describe("City whose courts will handle disputes, e.g. 'Mumbai'"),
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

export const service: ContractType = {
  id: "service",
  name: "Service Agreement",
  shortName: "Service",
  description: "For businesses providing services to other businesses: fixed fee or monthly retainer.",
  idPrefix: "SRV",
  example:
    "Brightline Digital will run social media marketing for Mehta Traders for ₹40,000 a month, from 1 January to 30 June. We're both in Mumbai.",

  schema,
  fields: [
    { key: "clientName", label: "Client", kind: "text", required: true },
    { key: "providerName", label: "Service provider", kind: "text", required: true },
    { key: "services", label: "Services", kind: "text", required: true },
    {
      key: "paymentModel",
      label: "Payment",
      kind: "choice",
      required: true,
      choices: { fixed: "Fixed fee in milestones", monthly: "Monthly retainer" },
    },
    // Required or not depends on the payment model, so validate() checks these.
    { key: "totalFee", label: "Total fee", kind: "money", required: false },
    { key: "milestones", label: "Milestones", kind: "list", required: false, formatItem: formatMilestone },
    { key: "monthlyFee", label: "Monthly fee", kind: "money", required: false },
    { key: "startDate", label: "Start date", kind: "date", required: true },
    { key: "endDate", label: "End date", kind: "date", required: true },
    { key: "jurisdictionCity", label: "Jurisdiction", kind: "text", required: true },
  ],

  intakeInstructions: `You are Sage, an assistant that helps Indian businesses set up a service agreement between a service provider and a client business.

Your job right now is ONLY to collect the details. Do not write the agreement yet.

Every time the user gives you new or changed details, call the updateDeal tool.
- Fill in only what the user actually said. Use null for anything you don't know. Never guess names, amounts or dates.
- paymentModel is "fixed" for a total fee paid in stages (milestones), or "monthly" for a monthly retainer. If it's unclear, ask.
- For "fixed", collect totalFee and milestones (always send the complete list). For "monthly", collect monthlyFee. Leave the other model's fields null.
- Amounts are in Indian rupees as plain numbers (e.g. 40000, not "40k").
- Dates are YYYY-MM-DD. If the user gives a date without a year, assume the next upcoming one and don't ask about the year.

After updating, reply in 1–3 short, friendly sentences:
- Confirm what you understood. Write dates the way people say them, e.g. "1 January", not "2027-01-01".
- Ask about ONE or TWO missing details at a time, most important first: both business names, the services, fixed or monthly payment, the fee details, start and end dates, jurisdiction city.
- If milestone amounts don't add up to the total fee, point it out and ask which is right.
- When everything is filled in, say the details are complete and the user can review them on the right.

Use simple English. No legal jargon. You don't give legal advice.`,

  clauses: serviceClauses,

  placeholders: {
    // From the chat
    clientName: { from: "deal", field: "clientName" },
    providerName: { from: "deal", field: "providerName" },
    services: { from: "deal", field: "services" },
    totalFee: { from: "deal", field: "totalFee" },
    monthlyFee: { from: "deal", field: "monthlyFee" },
    startDate: { from: "deal", field: "startDate" },
    endDate: { from: "deal", field: "endDate" },
    jurisdictionCity: { from: "deal", field: "jurisdictionCity" },
    // Calculated by code
    agreementDate: { from: "derived", description: "The date the agreement is generated" },
    milestoneSchedule: { from: "derived", description: "Numbered list of milestones with amounts and due dates" },
    // Standard values the user can change
    paymentDueDays: { from: "default", value: "30", description: "Days to pay an invoice" },
    lateInterestRate: { from: "default", value: "12", description: "Yearly interest on late payments, in percent" },
    acceptanceDays: { from: "default", value: "7", description: "Days the client has to review a deliverable" },
    noticeDays: { from: "default", value: "30", description: "Notice period to end the agreement without a reason" },
    cureDays: { from: "default", value: "15", description: "Days to fix a breach after being told about it" },
    confidentialityYears: { from: "default", value: "2", description: "Years confidentiality lasts after the agreement ends" },
    forceMajeureDays: { from: "default", value: "30", description: "Days of delay after which either side can end the agreement" },
    disputeTalkDays: { from: "default", value: "30", description: "Days to try resolving a dispute by talking first" },
    // Typed in by the user before signing
    clientAddress: { from: "manual", description: "Client's registered address" },
    providerAddress: { from: "manual", description: "Service provider's registered address" },
    clientEmail: { from: "manual", description: "Client's email for notices" },
    providerEmail: { from: "manual", description: "Service provider's email for notices" },
  },

  // Checks done in plain code, not by the AI.
  validate(d: DealValues) {
    const deal = d as Deal;
    const problems: string[] = [];
    const milestones = deal.milestones ?? [];

    if (deal.paymentModel === "fixed") {
      if (deal.totalFee === null || deal.totalFee === undefined) problems.push("The total fee is missing.");
      if (milestones.length === 0) problems.push("Add at least one milestone for the fixed fee.");
      if (milestones.some((m) => m.amount === null)) {
        problems.push("Some milestones don't have a payment amount yet.");
      } else if (deal.totalFee && milestones.length > 0) {
        const sum = milestones.reduce((total, m) => total + (m.amount ?? 0), 0);
        if (sum !== deal.totalFee) {
          problems.push(`Milestone payments add up to ₹${rupees(sum)}, but the total fee is ₹${rupees(deal.totalFee)}.`);
        }
      }
    }
    if (deal.paymentModel === "monthly" && (deal.monthlyFee === null || deal.monthlyFee === undefined)) {
      problems.push("The monthly fee is missing.");
    }
    // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
    if (deal.startDate && deal.endDate && deal.endDate < deal.startDate) {
      problems.push("The end date is before the start date.");
    }
    if (deal.endDate && milestones.some((m) => m.dueDate && m.dueDate > deal.endDate!)) {
      problems.push("A milestone is due after the end date.");
    }
    return problems;
  },

  derived(d: DealValues) {
    const deal = d as Deal;
    return {
      milestoneSchedule: (deal.milestones ?? [])
        .map(
          (m, i) =>
            `${i + 1}. ${m.title}: ₹${m.amount !== null ? rupees(m.amount) : "?"}, ` +
            (m.dueDate ? `due by ${formatDate(m.dueDate)}` : "due on completion"),
        )
        .join("\n"),
    };
  },

  parties: (d: DealValues) => [
    { role: "Client", name: String(d.clientName ?? "") },
    { role: "Service Provider", name: String(d.providerName ?? "") },
  ],

  refine: {
    placeholder: "services",
    instructions: `You turn a business's description of services into a clear list for a contract.
Rules:
- Use only what the description says. Never add services, quantities, tools or deadlines that aren't mentioned.
- 2 to 6 items, each one short and specific.
- Plain English, no legal language, no prices or dates.`,
    prompt: (d: DealValues) => `Services: ${(d as Deal).services}`,
  },
};
