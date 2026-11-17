import { z } from "zod";
import { formatDate, rupees } from "../engine";
import type { ContractType, DealValues } from "../types";
import { loanClauses } from "./clauses";
import { instalmentSchedule, lumpSumPayment, rupeesInWords, type Payment } from "./math";

// ---------- What the chat collects ----------

// Every field is nullable: the AI sends null for anything not mentioned yet.
const schema = z.object({
  lenderName: z.string().nullable().describe("Full name of the person lending the money"),
  borrowerName: z.string().nullable().describe("Full name of the person borrowing the money"),
  principal: z.number().nullable().describe("Amount lent in INR as a plain number"),
  interestRate: z
    .number()
    .nullable()
    .describe("Simple interest per year, in percent. 0 for an interest-free loan."),
  loanDate: z.string().nullable().describe("Date the money is given, as YYYY-MM-DD"),
  repaymentType: z
    .enum(["lumpSum", "instalments"])
    .nullable()
    .describe("'lumpSum' for one repayment on a date, 'instalments' for equal monthly instalments"),
  repaymentDate: z.string().nullable().describe("lumpSum only: repayment date as YYYY-MM-DD"),
  instalmentCount: z.number().nullable().describe("instalments only: number of monthly instalments"),
  firstInstalmentDate: z.string().nullable().describe("instalments only: date of the first instalment as YYYY-MM-DD"),
  jurisdictionCity: z.string().nullable().describe("City whose courts will handle disputes, e.g. 'Pune'"),
});

type Deal = z.infer<typeof schema>;

// The repayment schedule, or null if there isn't enough information yet.
function schedule(deal: Deal): Payment[] | null {
  const { principal, interestRate, loanDate } = deal;
  if (!principal || interestRate === null || interestRate === undefined || !loanDate) return null;
  if (deal.repaymentType === "lumpSum" && deal.repaymentDate) {
    return [lumpSumPayment(principal, interestRate, loanDate, deal.repaymentDate)];
  }
  if (deal.repaymentType === "instalments" && deal.instalmentCount && deal.firstInstalmentDate) {
    return instalmentSchedule(principal, interestRate, deal.instalmentCount, deal.firstInstalmentDate);
  }
  return null;
}

// ---------- The agreement type ----------

export const loan: ContractType = {
  id: "loan",
  name: "Personal Loan Agreement",
  shortName: "Loan",
  description: "Lend money to a friend, relative or individual, with a clear repayment schedule.",
  idPrefix: "LOA",
  example:
    "I'm lending my friend Rahul Verma ₹2,00,000 on 1 December at 10% interest a year. He'll repay in 12 monthly instalments starting 1 January. I'm Priya Sharma, and we're both in Pune.",

  schema,
  fields: [
    { key: "lenderName", label: "Lender", kind: "text", required: true },
    { key: "borrowerName", label: "Borrower", kind: "text", required: true },
    { key: "principal", label: "Amount lent", kind: "money", required: true },
    { key: "interestRate", label: "Interest (% per year)", kind: "number", required: true },
    { key: "loanDate", label: "Loan date", kind: "date", required: true },
    {
      key: "repaymentType",
      label: "Repayment",
      kind: "choice",
      required: true,
      choices: { lumpSum: "One payment on a date", instalments: "Monthly instalments" },
    },
    // Required or not depends on the repayment type, so validate() checks these.
    { key: "repaymentDate", label: "Repayment date", kind: "date", required: false },
    { key: "instalmentCount", label: "Number of instalments", kind: "number", required: false },
    { key: "firstInstalmentDate", label: "First instalment", kind: "date", required: false },
    { key: "jurisdictionCity", label: "Jurisdiction", kind: "text", required: true },
  ],

  intakeInstructions: `You are Sage, an assistant that helps people in India set up a personal loan agreement between individuals.

Your job right now is ONLY to collect the details. Do not write the agreement yet, and never calculate repayment amounts yourself: Sage's code does that.

Every time the user gives you new or changed details, call the updateDeal tool.
- Fill in only what the user actually said. Use null for anything you don't know. Never guess names, amounts, rates or dates.
- interestRate is simple interest per year in percent. If the user says the loan is interest-free, use 0. If they don't mention interest, ask.
- repaymentType is "lumpSum" for one repayment on a date, or "instalments" for equal monthly instalments. For lumpSum, collect repaymentDate. For instalments, collect instalmentCount and firstInstalmentDate. Leave the other type's fields null.
- Amounts are in Indian rupees as plain numbers (e.g. 200000, not "2 lakh").
- Dates are YYYY-MM-DD. If the user gives a date without a year, assume the next upcoming one and don't ask about the year.

After updating, reply in 1–3 short, friendly sentences:
- Confirm what you understood. Write dates the way people say them, e.g. "1 December", and amounts the Indian way, e.g. "₹2,00,000".
- Ask about ONE or TWO missing details at a time, most important first: lender and borrower names, amount, interest, loan date, how it's repaid, jurisdiction city.
- If the borrower is a company, explain kindly that this template is for loans between individuals, because companies borrowing money have extra legal rules, and suggest talking to a lawyer.
- If the user plans to hand over cash, mention that bank transfer or UPI is safer and that Indian tax law penalises cash loans of ₹20,000 or more.
- When everything is filled in, say the details are complete and the repayment schedule will be calculated in the agreement.

Use simple English. No legal jargon. You don't give legal or financial advice.`,

  clauses: loanClauses,

  placeholders: {
    // From the chat
    lenderName: { from: "deal", field: "lenderName" },
    borrowerName: { from: "deal", field: "borrowerName" },
    principal: { from: "deal", field: "principal" },
    loanDate: { from: "deal", field: "loanDate" },
    jurisdictionCity: { from: "deal", field: "jurisdictionCity" },
    // Calculated by code
    agreementDate: { from: "derived", description: "The date the agreement is generated" },
    principalInWords: { from: "derived", description: "e.g. 'Rupees Two Lakh only'" },
    interestTerms: { from: "derived", description: "The interest sentence, or 'interest-free'" },
    repaymentSchedule: { from: "derived", description: "Every payment with its date and amount" },
    totalRepayable: { from: "derived", description: "Sum of all payments" },
    // Standard values the user can change
    lateInterestRate: { from: "default", value: "2", description: "Extra yearly interest on late payments, in percent" },
    defaultDays: { from: "default", value: "30", description: "Days a payment can stay unpaid after a reminder" },
    disputeTalkDays: { from: "default", value: "30", description: "Days to try resolving a dispute by talking first" },
    // Typed in by the user before signing
    lenderAddress: { from: "manual", description: "Lender's postal address" },
    borrowerAddress: { from: "manual", description: "Borrower's postal address" },
    lenderEmail: { from: "manual", description: "Lender's email for notices" },
    borrowerEmail: { from: "manual", description: "Borrower's email for notices" },
  },

  // Checks done in plain code, not by the AI.
  validate(d: DealValues) {
    const deal = d as Deal;
    const problems: string[] = [];

    if (deal.principal !== null && deal.principal !== undefined && deal.principal <= 0) {
      problems.push("The loan amount must be more than zero.");
    }
    if (deal.interestRate !== null && deal.interestRate !== undefined && deal.interestRate < 0) {
      problems.push("The interest rate can't be negative.");
    }
    if (deal.repaymentType === "lumpSum") {
      if (!deal.repaymentDate) problems.push("The repayment date is missing.");
      else if (deal.loanDate && deal.repaymentDate <= deal.loanDate) {
        problems.push("The repayment date must be after the loan date.");
      }
    }
    if (deal.repaymentType === "instalments") {
      const n = deal.instalmentCount;
      if (n === null || n === undefined) problems.push("The number of instalments is missing.");
      else if (!Number.isInteger(n) || n < 1 || n > 120) {
        problems.push("The number of instalments must be a whole number from 1 to 120.");
      }
      if (!deal.firstInstalmentDate) problems.push("The first instalment date is missing.");
      else if (deal.loanDate && deal.firstInstalmentDate <= deal.loanDate) {
        problems.push("The first instalment must be after the loan date.");
      }
    }
    if (
      deal.lenderName &&
      deal.borrowerName &&
      deal.lenderName.trim().toLowerCase() === deal.borrowerName.trim().toLowerCase()
    ) {
      problems.push("The lender and borrower have the same name.");
    }
    return problems;
  },

  derived(d: DealValues) {
    const deal = d as Deal;
    const payments = schedule(deal) ?? [];
    const rate = deal.interestRate ?? 0;
    const instalments = deal.repaymentType === "instalments";

    const interestTerms =
      rate === 0
        ? "The Loan is interest-free. The Borrower shall repay only the amount lent."
        : instalments
          ? `The Loan carries simple interest at ${rate}% per year, calculated monthly on the amount still owed. The interest is included in the instalments set out in the "Repayment" clause.`
          : `The Loan carries simple interest at ${rate}% per year from the date of the Loan until repayment. The interest is included in the amount set out in the "Repayment" clause.`;

    return {
      principalInWords: rupeesInWords(deal.principal ?? 0),
      interestTerms,
      repaymentSchedule: payments
        .map((p, i) =>
          instalments
            ? `${i + 1}. ${formatDate(p.date)}: ₹${rupees(p.amount)}`
            : `In one payment of ₹${rupees(p.amount)} on ${formatDate(p.date)}.`,
        )
        .join("\n"),
      totalRepayable: rupees(payments.reduce((total, p) => total + p.amount, 0)),
    };
  },

  parties: (d: DealValues) => [
    { role: "Lender", name: String(d.lenderName ?? "") },
    { role: "Borrower", name: String(d.borrowerName ?? "") },
  ],
};
