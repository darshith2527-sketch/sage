import type { Clause } from "../types";

// Clause library for the Personal Loan Agreement (loans between individuals).
// Written for Sage against Indian law. Not legal advice: these should be reviewed
// by a qualified lawyer before real-world use.
// All amounts and the repayment schedule are calculated in code (see math.ts).

export const loanClauses: Clause[] = [
  {
    id: "LOA-PAR-01",
    category: "parties",
    title: "Parties",
    include: "required",
    text: `This Loan Agreement ("Agreement") is made on {{agreementDate}} between:

{{lenderName}}, of {{lenderAddress}} (the "Lender"); and

{{borrowerName}}, of {{borrowerAddress}} (the "Borrower").

The Lender and the Borrower are each a "Party". Each Party confirms that they are of the age of majority and of sound mind, and enter into this Agreement freely.`,
    plainExplanation:
      "Who is lending and who is borrowing. Both confirm they're adults who understand what they're signing.",
    riskNotes:
      "A loan agreement with a minor is void in India, and money lent to a minor generally can't be recovered under the contract.",
    legalBasis:
      "Indian Contract Act, 1872, ss. 10–12: contracts need free consent of competent parties, meaning adults of sound mind.",
  },
  {
    id: "LOA-AMT-01",
    category: "loan",
    title: "The Loan",
    include: "required",
    text: `The Lender agrees to lend the Borrower ₹{{principal}} ({{principalInWords}}) (the "Loan") on {{loanDate}}, by bank transfer or UPI to an account in the Borrower's name. The Borrower shall confirm receipt in writing (email or message is enough) once the money arrives.`,
    plainExplanation:
      "How much is being lent, when, and how. The borrower confirms in writing once they receive it.",
    riskNotes:
      "Indian income-tax law penalises giving, taking or repaying loans of ₹20,000 or more in cash, so use bank transfers. A written receipt is the best proof that the money was actually given.",
    legalBasis:
      "Indian Contract Act, 1872, s. 2(d) (consideration) and general principles of loans.",
  },
  {
    id: "LOA-INT-01",
    category: "interest",
    title: "Interest",
    include: "required",
    text: `{{interestTerms}}`,
    plainExplanation: "Whether the loan carries interest, and how much.",
    riskNotes:
      "Courts can reduce interest that is excessive and unfair. If the lender lends money as a regular business, state money-lending laws may require a licence and cap interest rates.",
    legalBasis:
      "Usurious Loans Act, 1918, s. 3 (courts may reopen transactions where interest is excessive and the transaction substantially unfair); state money-lenders Acts.",
  },
  {
    id: "LOA-REP-01",
    category: "repayment",
    title: "Repayment",
    include: "required",
    text: `The Borrower shall repay the Loan, with any interest, as follows:

{{repaymentSchedule}}

Total repayable: ₹{{totalRepayable}}.`,
    plainExplanation:
      "Exactly when each payment is due and how much it is. Sage calculates these in code, so the numbers add up.",
    riskNotes:
      "Without fixed dates and amounts, it's hard to prove when a payment was missed. A suit to recover a loan must generally be filed within three years.",
    legalBasis:
      "Indian Contract Act, 1872, s. 37 (parties must perform their promises); Limitation Act, 1963 (time limits for recovery suits).",
  },
  {
    id: "LOA-REP-02",
    category: "repayment",
    title: "Early Repayment",
    include: "standard",
    text: `The Borrower may repay all or part of the Loan early at any time without penalty. Interest is payable only up to the date of repayment. For early part-payments, the Parties shall agree in writing how the remaining payments change.`,
    plainExplanation:
      "The borrower can pay back early at no extra cost, and only pays interest for the time they actually had the money.",
    riskNotes:
      "Without this, there may be disputes over whether interest is still owed for the full original period.",
    legalBasis: "General contract principles.",
  },
  {
    id: "LOA-PAY-01",
    category: "repayment",
    title: "How Payments Are Made",
    include: "standard",
    text: `All payments shall be made by bank transfer or UPI to the account the Lender names in writing. Each payment is applied first to interest due and then to the Loan amount. On request, the Lender shall confirm in writing each payment received and the amount still owed.`,
    plainExplanation:
      "Payments go by bank transfer or UPI, and the lender confirms what's been received and what's left.",
    riskNotes:
      "Cash repayments leave no record and, above ₹20,000, can attract tax penalties.",
    legalBasis: "Indian Contract Act, 1872, ss. 59–61 (how payments are applied to debts).",
  },
  {
    id: "LOA-LAT-01",
    category: "repayment",
    title: "Late Payment",
    include: "standard",
    text: `If a payment is late, the Borrower shall pay additional simple interest on the overdue amount at {{lateInterestRate}}% per year, from the due date until it is paid.`,
    plainExplanation: "Late payments carry a small extra interest charge until they're paid.",
    riskNotes:
      "Late charges must be reasonable: Indian courts reduce charges that look like a penalty.",
    legalBasis:
      "Indian Contract Act, 1872, s. 74 (only reasonable compensation is recoverable for breach); Usurious Loans Act, 1918, s. 3.",
  },
  {
    id: "LOA-DEF-01",
    category: "default",
    title: "Default",
    include: "required",
    text: `The Borrower is in default if:
(a) any payment remains unpaid for more than {{defaultDays}} days after the Lender sends a written reminder; or
(b) any statement the Borrower made in this Agreement is materially untrue.
If the Borrower is in default, the Lender may, by written notice, demand that the whole amount still owed, with interest due to date, be paid within 30 days.`,
    plainExplanation:
      "If the borrower misses a payment and ignores a reminder, the lender can ask for everything still owed to be paid back.",
    riskNotes:
      "Without a default clause, the lender may have to wait for each instalment date to pass before recovering anything.",
    legalBasis:
      "Indian Contract Act, 1872, ss. 39 and 73 (refusal to perform, and compensation for breach).",
  },
  {
    id: "LOA-STM-01",
    category: "statements",
    title: "Borrower's Statements",
    include: "standard",
    text: `The Borrower confirms that they are borrowing in their personal capacity, that they are legally able to take this Loan and repay it, and that the information they have given the Lender is true.`,
    plainExplanation:
      "The borrower confirms they're borrowing personally and that what they've said is true.",
    riskNotes:
      "If a business is really the borrower, different rules can apply, especially for companies.",
    legalBasis: "General contract principles.",
  },
  {
    id: "LOA-SEC-01",
    category: "security",
    title: "Unsecured Loan",
    include: "standard",
    text: `This Loan is unsecured. The Borrower has not given any property, asset or guarantee as security for it.`,
    plainExplanation:
      "Nothing is pledged as collateral. If the borrower doesn't pay, the lender's remedy is to claim the money owed.",
    riskNotes:
      "Pledging property or taking a guarantee needs separate documents and, often, registration.",
    legalBasis: "General contract principles.",
  },
  {
    id: "LOA-STA-01",
    category: "stamp",
    title: "Stamp Duty",
    include: "standard",
    text: `The Parties shall ensure that this Agreement is stamped as required by the stamp law of the State where it is signed. The Borrower shall bear the stamp duty.`,
    plainExplanation:
      "Loan agreements need to be stamped under state law. The borrower pays the stamp duty.",
    riskNotes:
      "An unstamped agreement can't be used as evidence in court until the duty and a penalty are paid. Rates differ by state; e-stamping is available in many states.",
    legalBasis:
      "Indian Stamp Act, 1899, s. 35 (instruments not duly stamped are inadmissible in evidence), and the relevant State stamp Act.",
  },
  {
    id: "LOA-DIS-01",
    category: "disputes",
    title: "Dispute Resolution",
    include: "required",
    text: `If a dispute arises, the Parties shall first try to resolve it through good-faith discussion for {{disputeTalkDays}} days, and may try mediation. If it is not resolved, it shall be referred to arbitration by a sole arbitrator appointed by agreement of the Parties, under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be {{jurisdictionCity}}, and the language shall be English. The award will be final and binding.`,
    plainExplanation:
      "Disagreements are settled by talking first. If that fails, a single neutral arbitrator decides.",
    riskNotes: "An arbitration clause must clearly name the seat. A sole arbitrator keeps costs low.",
    legalBasis:
      "Arbitration and Conciliation Act, 1996, ss. 7, 10, 11, 20 and 22; Indian Contract Act, 1872, s. 28, Exception 1.",
  },
  {
    id: "LOA-LAW-01",
    category: "law",
    title: "Governing Law and Jurisdiction",
    include: "required",
    text: `This Agreement is governed by the laws of India. Subject to the "Dispute Resolution" clause, the courts at {{jurisdictionCity}} have exclusive jurisdiction over matters arising from this Agreement.`,
    plainExplanation:
      "Indian law applies, and the courts of the chosen city handle anything that has to go to court.",
    riskNotes:
      "Pick a city connected to the parties or the loan, otherwise the chosen court may not have jurisdiction.",
    legalBasis:
      "Code of Civil Procedure, 1908, s. 20 (where suits may be filed); Indian Contract Act, 1872, s. 28.",
  },
  {
    id: "LOA-NOT-01",
    category: "notices",
    title: "Notices",
    include: "standard",
    text: `Formal notices under this Agreement, including payment reminders, must be in writing and sent by email to the Lender at {{lenderEmail}} and to the Borrower at {{borrowerEmail}}, or to another address a Party gives by notice. A notice is treated as received on the next working day after it is sent.`,
    plainExplanation: "How reminders and official messages are sent. Email counts.",
    riskNotes: "Without agreed addresses, a borrower can claim they never received a reminder.",
    legalBasis:
      "Information Technology Act, 2000, ss. 4 and 13 (legal recognition of electronic records, and time of dispatch and receipt).",
  },
  {
    id: "LOA-GEN-01",
    category: "general",
    title: "General",
    include: "standard",
    text: `(a) This Agreement is the entire agreement between the Parties about the Loan and replaces any earlier discussions.
(b) Any change to this Agreement must be in writing and agreed by both Parties.
(c) If any part of this Agreement is found invalid, the rest remains in force.
(d) Neither Party may transfer their rights or obligations under this Agreement without the other's written consent.
(e) Not enforcing a right immediately does not mean giving it up.`,
    plainExplanation:
      "Standard housekeeping: this document is the whole deal, and changes must be in writing.",
    riskNotes:
      "Without an entire-agreement clause, old messages and promises can be argued to be part of the deal.",
    legalBasis: "Indian Contract Act, 1872, s. 62 (alteration of a contract) and general principles.",
  },
  {
    id: "LOA-SIG-01",
    category: "signatures",
    title: "Electronic Signatures",
    include: "standard",
    text: `This Agreement may be signed electronically, and in separate copies that together form one agreement. Electronic signatures and electronic records of this Agreement are as valid as handwritten signatures and paper copies.`,
    plainExplanation: "You can sign online. It's as valid as signing on paper.",
    riskNotes:
      "Stamp duty still applies to electronically signed agreements; use e-stamping where the State offers it.",
    legalBasis:
      "Information Technology Act, 2000, ss. 5 and 10A (legal recognition of electronic signatures, and validity of contracts formed electronically).",
  },
];
