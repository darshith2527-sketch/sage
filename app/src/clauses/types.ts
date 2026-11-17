import type { Deal } from "@/lib/deal";

// How a clause gets into a contract.
// - "required": must be in every contract of this type. Code checks this.
// - "standard": included by default; the user may remove it.
// - "optional": only included when the user or the deal asks for it.
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
};

// Every {{placeholder}} a clause may use, and where its value comes from.
// - "deal": filled from the chat intake form (must match a Deal field)
// - "derived": calculated by code, e.g. today's date or the milestone list
// - "default": a sensible standard value the user can change
// - "manual": the user types it in before signing
export type PlaceholderSource =
  | { from: "deal"; field: keyof Deal }
  | { from: "derived"; description: string }
  | { from: "default"; value: string; description: string }
  | { from: "manual"; description: string };

export const PLACEHOLDERS: Record<string, PlaceholderSource> = {
  // From the chat intake
  clientName: { from: "deal", field: "clientName" },
  freelancerName: { from: "deal", field: "freelancerName" },
  scope: { from: "deal", field: "scope" },
  totalFee: { from: "deal", field: "totalFee" },
  startDate: { from: "deal", field: "startDate" },
  deadline: { from: "deal", field: "deadline" },
  revisionRounds: { from: "deal", field: "revisionRounds" },
  jurisdictionCity: { from: "deal", field: "jurisdictionCity" },

  // Calculated by code
  agreementDate: { from: "derived", description: "The date the contract is generated" },
  milestoneSchedule: {
    from: "derived",
    description: "Numbered list of milestones with amounts and due dates",
  },

  // Standard values the user can change
  paymentDueDays: { from: "default", value: "15", description: "Days to pay an invoice" },
  lateInterestRate: {
    from: "default",
    value: "12",
    description: "Yearly interest on late payments, in percent",
  },
  acceptanceDays: {
    from: "default",
    value: "7",
    description: "Days the client has to review a deliverable",
  },
  noticeDays: {
    from: "default",
    value: "15",
    description: "Notice period to end the contract without a reason",
  },
  cureDays: {
    from: "default",
    value: "15",
    description: "Days to fix a breach after being told about it",
  },
  confidentialityYears: {
    from: "default",
    value: "2",
    description: "Years confidentiality lasts after the contract ends",
  },
  forceMajeureDays: {
    from: "default",
    value: "30",
    description: "Days of delay after which either side can end the contract",
  },
  disputeTalkDays: {
    from: "default",
    value: "30",
    description: "Days to try resolving a dispute by talking first",
  },

  // Typed in by the user before signing
  clientAddress: { from: "manual", description: "Client's postal address" },
  freelancerAddress: { from: "manual", description: "Freelancer's postal address" },
  clientEmail: { from: "manual", description: "Client's email for notices" },
  freelancerEmail: { from: "manual", description: "Freelancer's email for notices" },
};

// Finds every {{placeholder}} name used in a piece of text.
export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
}
