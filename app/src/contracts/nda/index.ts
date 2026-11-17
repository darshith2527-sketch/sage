import { z } from "zod";
import type { ContractType, DealValues } from "../types";
import { ndaClauses } from "./clauses";

// ---------- What the chat collects ----------

// Every field is nullable: the AI sends null for anything not mentioned yet.
const schema = z.object({
  ndaKind: z
    .enum(["mutual", "oneWay"])
    .nullable()
    .describe("'mutual' if both sides will share confidential information, 'oneWay' if only one side shares"),
  partyOneName: z
    .string()
    .nullable()
    .describe("First party's name. For a one-way NDA, this is the party SHARING the information."),
  partyTwoName: z
    .string()
    .nullable()
    .describe("Second party's name. For a one-way NDA, this is the party RECEIVING the information."),
  purpose: z
    .string()
    .nullable()
    .describe("Why the information is being shared, as a short phrase, e.g. 'exploring a joint online store'"),
  confidentialityYears: z
    .number()
    .nullable()
    .describe("How many years the duty to keep secrets lasts after the agreement ends"),
  jurisdictionCity: z
    .string()
    .nullable()
    .describe("City whose courts will handle disputes, e.g. 'Bengaluru'"),
});

type Deal = z.infer<typeof schema>;

// ---------- The agreement type ----------

export const nda: ContractType = {
  id: "nda",
  name: "Non-Disclosure Agreement",
  shortName: "NDA",
  description: "Keep shared business information secret. Mutual or one-way.",
  idPrefix: "NDA",
  example:
    "Mehta Traders and I want to explore building an online store together, and we'll both share business details. Keep it confidential for 3 years. We're in Bengaluru, and my name is Priya Sharma.",

  schema,
  fields: [
    {
      key: "ndaKind",
      label: "Type",
      kind: "choice",
      required: true,
      choices: { mutual: "Mutual (both sides share)", oneWay: "One-way (one side shares)" },
    },
    { key: "partyOneName", label: "First party (sharing)", kind: "text", required: true },
    { key: "partyTwoName", label: "Second party (receiving)", kind: "text", required: true },
    { key: "purpose", label: "Purpose", kind: "text", required: true },
    { key: "confidentialityYears", label: "Confidentiality (years)", kind: "number", required: true },
    { key: "jurisdictionCity", label: "Jurisdiction", kind: "text", required: true },
  ],

  intakeInstructions: `You are Sage, an assistant that helps people in India set up a non-disclosure agreement (NDA).

Your job right now is ONLY to collect the details. Do not write the agreement yet.

Every time the user gives you new or changed details, call the updateDeal tool.
- Fill in only what the user actually said. Use null for anything you don't know. Never guess names.
- ndaKind is "mutual" if both sides will share confidential information, "oneWay" if only one side shares. If it's unclear, ask.
- For a one-way NDA, partyOneName is the side SHARING the information and partyTwoName the side RECEIVING it.
- purpose is a short phrase describing why information is being shared.

After updating, reply in 1–3 short, friendly sentences:
- Confirm what you understood.
- Ask about ONE or TWO missing details at a time, most important first: mutual or one-way, both party names, purpose, how many years confidentiality should last, jurisdiction city.
- If the user wants to stop the other side from working with competitors, explain kindly that in India agreements can't stop someone from doing business (Contract Act s. 27); an NDA protects the information instead.
- When everything is filled in, say the details are complete and the user can review them on the right.

Use simple English. No legal jargon. You don't give legal advice.`,

  clauses: ndaClauses,

  placeholders: {
    // From the chat
    partyOneName: { from: "deal", field: "partyOneName" },
    partyTwoName: { from: "deal", field: "partyTwoName" },
    purpose: { from: "deal", field: "purpose" },
    jurisdictionCity: { from: "deal", field: "jurisdictionCity" },
    // Calculated by code
    agreementDate: { from: "derived", description: "The date the agreement is generated" },
    confidentialityPeriod: { from: "derived", description: "e.g. '3 years'" },
    // Standard values the user can change
    disputeTalkDays: { from: "default", value: "30", description: "Days to try resolving a dispute by talking first" },
    // Typed in by the user before signing
    partyOneAddress: { from: "manual", description: "First party's postal address" },
    partyTwoAddress: { from: "manual", description: "Second party's postal address" },
    partyOneEmail: { from: "manual", description: "First party's email for notices" },
    partyTwoEmail: { from: "manual", description: "Second party's email for notices" },
  },

  // Checks done in plain code, not by the AI.
  validate(d: DealValues) {
    const deal = d as Deal;
    const problems: string[] = [];
    if (deal.confidentialityYears !== null && deal.confidentialityYears !== undefined) {
      if (deal.confidentialityYears < 1) {
        problems.push("Confidentiality should last at least 1 year.");
      }
      if (!Number.isInteger(deal.confidentialityYears)) {
        problems.push("Use a whole number of years for confidentiality.");
      }
    }
    if (
      deal.partyOneName &&
      deal.partyTwoName &&
      deal.partyOneName.trim().toLowerCase() === deal.partyTwoName.trim().toLowerCase()
    ) {
      problems.push("The two parties have the same name.");
    }
    return problems;
  },

  derived(d: DealValues) {
    const years = (d as Deal).confidentialityYears ?? 0;
    return { confidentialityPeriod: years === 1 ? "1 year" : `${years} years` };
  },

  parties(d: DealValues) {
    const deal = d as Deal;
    const oneWay = deal.ndaKind === "oneWay";
    return [
      { role: oneWay ? "Disclosing Party" : "First Party", name: deal.partyOneName ?? "" },
      { role: oneWay ? "Receiving Party" : "Second Party", name: deal.partyTwoName ?? "" },
    ];
  },
};
