import type { Clause } from "./types";

// Clause library for the Freelance Service Agreement (FSA).
// Written for Sage against Indian law. Not legal advice: these should be reviewed
// by a qualified lawyer before real-world use.
// Clauses are listed in the order they appear in a finished contract.

export const freelanceClauses: Clause[] = [
  {
    id: "FSA-PAR-01",
    category: "parties",
    title: "Parties",
    include: "required",
    text: `This Freelance Service Agreement ("Agreement") is made on {{agreementDate}} between:

{{clientName}}, of {{clientAddress}} (the "Client"); and

{{freelancerName}}, of {{freelancerAddress}} (the "Freelancer").

The Client and the Freelancer are each a "Party" and together the "Parties". Each Party confirms that it is legally able to enter into this Agreement and does so freely.`,
    plainExplanation:
      "Who is making the deal. Both sides confirm they're allowed to sign and are doing so willingly.",
    riskNotes:
      "Wrong or missing party names make it hard to enforce the contract against the right person or business. If the client is a company, use its full registered name.",
    legalBasis:
      "Indian Contract Act, 1872, s. 10: an agreement is a contract when made by the free consent of parties competent to contract, for a lawful consideration and object.",
  },
  {
    id: "FSA-DEF-01",
    category: "definitions",
    title: "Definitions",
    include: "standard",
    text: `In this Agreement:
(a) "Services" means the work the Freelancer will do under this Agreement.
(b) "Deliverables" means everything the Freelancer produces and hands over as part of the Services.
(c) "Fees" means the total amount payable to the Freelancer under this Agreement.
(d) "Milestone" means a stage of the work, with its own deliverables, due date and payment.
(e) "Confidential Information" means any non-public information a Party shares with the other in connection with this Agreement, whether business, technical or personal.
(f) "Business Day" means any day other than a Saturday, Sunday or public holiday in {{jurisdictionCity}}.`,
    plainExplanation:
      "Fixes the meaning of key words used throughout the contract, so both sides read them the same way.",
    riskNotes:
      "Without definitions, words like 'deliverables' or 'confidential' can be argued over later.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-SCO-01",
    category: "scope",
    title: "Scope of Work",
    include: "required",
    text: `The Freelancer shall provide the following Services and Deliverables:

{{scope}}

Anything not described above is outside the scope of this Agreement and will be handled under the "Changes to Scope" clause.`,
    plainExplanation:
      "Exactly what you'll deliver. Anything extra the client asks for later counts as new work.",
    riskNotes:
      "A vague scope is the most common cause of 'one more small change' disputes and unpaid extra work.",
    legalBasis:
      "Indian Contract Act, 1872, s. 29: agreements whose meaning is not certain, or capable of being made certain, are void.",
  },
  {
    id: "FSA-SCO-02",
    category: "scope",
    title: "Changes to Scope",
    include: "standard",
    text: `Either Party may request a change to the Services. A change takes effect only when both Parties agree in writing (email is enough) on what will change, any additional Fees and any new due dates. Until a change is agreed, the Freelancer is not obliged to do the additional work.`,
    plainExplanation:
      "New requests need a written yes from both sides on price and timing before work starts.",
    riskNotes:
      "Without this, extra work is often done on a verbal promise and never paid for.",
    legalBasis:
      "Indian Contract Act, 1872, s. 62: parties may agree to substitute or alter a contract.",
  },
  {
    id: "FSA-REV-01",
    category: "revisions",
    title: "Revisions",
    include: "standard",
    text: `The Fees include {{revisionRounds}} round(s) of revisions to the Deliverables. A round of revisions means one consolidated set of feedback from the Client on a Deliverable. Further revisions will be charged at a fee agreed in writing before the work begins.`,
    plainExplanation:
      "How many rounds of changes are included in the price. More rounds cost extra, agreed in advance.",
    riskNotes:
      "Unlimited revisions can turn a fixed-price project into unpaid work that never ends.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-TIM-01",
    category: "timeline",
    title: "Timeline",
    include: "required",
    text: `The Freelancer shall begin the Services on {{startDate}} and complete them by {{deadline}}, following the Milestones set out in the "Milestone Payments" clause. Deadlines will be extended by any delay caused by the Client, including late inputs, feedback or approvals.`,
    plainExplanation:
      "When the work starts and ends. If the client causes a delay, your deadlines move too.",
    riskNotes:
      "Without the extension rule, a freelancer can be blamed for delays the client caused.",
    legalBasis:
      "Indian Contract Act, 1872, s. 53: when a party prevents the other from performing, the contract is voidable at the option of the party so prevented.",
  },
  {
    id: "FSA-PAY-01",
    category: "payment",
    title: "Fees",
    include: "required",
    text: `In return for the Services, the Client shall pay the Freelancer total Fees of ₹{{totalFee}} (Indian Rupees), payable as set out in the "Milestone Payments" clause.`,
    plainExplanation: "The total price for the work, in rupees.",
    riskNotes: "A contract without a clear price invites disputes over what was agreed.",
    legalBasis:
      "Indian Contract Act, 1872, s. 2(d) and s. 25: an agreement needs consideration to be enforceable.",
  },
  {
    id: "FSA-PAY-02",
    category: "payment",
    title: "Milestone Payments",
    include: "required",
    text: `The Fees are payable in the following Milestones:

{{milestoneSchedule}}

When a Milestone is completed, the Freelancer will send an invoice for that Milestone's payment. The total of all Milestone payments equals the Fees.`,
    plainExplanation:
      "The work is split into stages, and you get paid as each stage is finished, not only at the end.",
    riskNotes:
      "Paying everything at the end puts all the risk on the freelancer. Milestone amounts must add up to the total fee.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-PAY-03",
    category: "payment",
    title: "Invoicing and Late Payment",
    include: "standard",
    text: `The Client shall pay each invoice within {{paymentDueDays}} days of receiving it. If a payment is late, the Client shall pay simple interest on the overdue amount at {{lateInterestRate}}% per year from the due date until payment. If any invoice remains unpaid for more than 30 days after its due date, the Freelancer may pause the Services, after giving written notice, until it is paid.`,
    plainExplanation:
      "The client has a fixed number of days to pay. Late payments earn interest, and you can pause work if a payment is badly overdue.",
    riskNotes:
      "Interest must be reasonable: Indian courts reduce charges that look like a penalty. If the freelancer is a registered micro or small enterprise, the MSMED Act gives stronger rights: payment within 45 days at most, and higher interest on delay.",
    legalBasis:
      "Indian Contract Act, 1872, s. 74 (only reasonable compensation is recoverable for breach); MSMED Act, 2006, ss. 15–16 (payment periods and interest for registered micro and small enterprises).",
  },
  {
    id: "FSA-PAY-04",
    category: "payment",
    title: "Taxes",
    include: "standard",
    text: `The Fees do not include GST. If the Freelancer is registered for GST, applicable GST will be added to each invoice. Where the law requires the Client to deduct tax at source from a payment, the Client shall deduct it, pay it to the government on time and give the Freelancer the official tax deduction certificate.`,
    plainExplanation:
      "GST is added on top if you're registered. If the client has to deduct tax, they must give you the certificate so you can claim it.",
    riskNotes:
      "If it's unclear whether GST is included, one side ends up paying it out of pocket. Missing deduction certificates make it hard for the freelancer to claim the tax credit.",
    legalBasis:
      "General contract principles; tax obligations arise under India's GST and income-tax laws, which apply regardless of the contract.",
  },
  {
    id: "FSA-PAY-05",
    category: "payment",
    title: "Expenses",
    include: "optional",
    text: `The Client shall reimburse reasonable expenses the Freelancer incurs in providing the Services, but only if the Client approved them in writing in advance. The Freelancer will provide receipts with the invoice.`,
    plainExplanation:
      "If you spend money for the project, such as stock images, the client pays it back, but only if they agreed beforehand.",
    riskNotes: "Without prior approval, expense claims are a frequent source of friction.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-PAY-06",
    category: "payment",
    title: "Escrow",
    include: "optional",
    text: `The Parties agree to use an escrow arrangement for the Fees. Before the Freelancer begins the Services, the Client shall deposit the Fees into escrow. The payment for each Milestone will be released to the Freelancer when the Client approves that Milestone, or when it is treated as accepted under the "Acceptance" clause. Any amount for Milestones not completed after termination will be dealt with under the "Effect of Termination" clause.`,
    plainExplanation:
      "The client puts the money aside before work starts, and each stage's payment is released when it's approved, so you know the money exists.",
    riskNotes:
      "The escrow provider and how funds are held must be clear. Holding other people's money in India is regulated, so a licensed provider should be used in real-world deployments.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-CLI-01",
    category: "client",
    title: "Client Responsibilities",
    include: "standard",
    text: `The Client shall provide the information, content, access and feedback the Freelancer reasonably needs, in good time. The Client confirms that it has the right to use any material it provides to the Freelancer.`,
    plainExplanation:
      "The client must give you what you need on time, and must own or have permission for anything they hand you.",
    riskNotes:
      "If the client hands over images or text they don't have rights to, the freelancer could be caught in a copyright claim.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-ACC-01",
    category: "acceptance",
    title: "Acceptance",
    include: "standard",
    text: `When the Freelancer delivers a Milestone, the Client shall review it within {{acceptanceDays}} days and either approve it or give written feedback explaining how it does not meet this Agreement. If the Client does neither within that period, the Milestone is treated as accepted.`,
    plainExplanation:
      "The client has a fixed number of days to approve or explain what's wrong. Silence counts as approval, so they can't stall payment by not replying.",
    riskNotes:
      "Without deemed acceptance, a client can delay payment indefinitely just by not responding.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-IP-01",
    category: "ip",
    title: "Ownership of Work",
    include: "required",
    text: `Upon receiving full payment of the Fees, the Freelancer assigns to the Client all copyright in the Deliverables, including the rights to reproduce, adapt, publish and distribute them, worldwide and for the full term of copyright. Until full payment is received, the Freelancer retains all rights in the Deliverables, and the Client may use them only to review the work. This assignment does not include the Freelancer's pre-existing materials, which are covered by the "Pre-existing Materials and Portfolio" clause.`,
    plainExplanation:
      "The client owns the finished work only after paying in full. Until then, it still belongs to you.",
    riskNotes:
      "If ownership passes before payment, a client can use the work and refuse to pay. If duration and territory aren't stated, Indian law limits an assignment to five years and to India only.",
    legalBasis:
      "Copyright Act, 1957, ss. 17–19: the author is the first owner of copyright; an assignment must be in writing and should state the rights, duration and territory (presumed to be five years and India if not stated).",
  },
  {
    id: "FSA-IP-02",
    category: "ip",
    title: "Pre-existing Materials and Portfolio",
    include: "standard",
    text: `The Freelancer keeps ownership of any tools, templates, code, designs or know-how that existed before this Agreement or were created independently of it ("Pre-existing Materials"). Where Pre-existing Materials are part of a Deliverable, the Freelancer grants the Client a non-exclusive, perpetual, worldwide licence to use them as part of that Deliverable. Unless the Client objects in writing, the Freelancer may show the Deliverables in their portfolio after they are publicly released, without revealing Confidential Information.`,
    plainExplanation:
      "Your own tools and templates stay yours, and the client can still use them inside the work. You can show the finished work in your portfolio.",
    riskNotes:
      "Without this, a broad ownership clause could accidentally hand over the freelancer's reusable tools.",
    legalBasis: "Copyright Act, 1957, s. 30: licences of copyright must be in writing.",
  },
  {
    id: "FSA-CON-01",
    category: "confidentiality",
    title: "Confidentiality",
    include: "required",
    text: `Each Party shall keep the other's Confidential Information secret, use it only for this Agreement and share it only with people who need it for this Agreement and are bound by similar confidentiality. This does not apply to information that is already public through no fault of the receiving Party, was already known to it, is received lawfully from someone else, or must be disclosed by law. These obligations continue for {{confidentialityYears}} years after this Agreement ends.`,
    plainExplanation:
      "Both sides keep each other's private information secret, during the project and for a set time after.",
    riskNotes:
      "Confidentiality without a time limit or clear exceptions is harder to enforce and to comply with.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-REL-01",
    category: "relationship",
    title: "Independent Contractor",
    include: "standard",
    text: `The Freelancer is an independent contractor, not an employee, partner or agent of the Client. The Freelancer decides how, when and where to do the work, subject to this Agreement, and is responsible for their own taxes, equipment and insurance. Neither Party can bind the other to any obligation.`,
    plainExplanation:
      "You're not the client's employee. You control how you work and handle your own taxes and tools.",
    riskNotes:
      "If the relationship looks like employment, questions about salary, benefits and control can arise.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-NSO-01",
    category: "relationship",
    title: "Non-solicitation",
    include: "optional",
    text: `While this Agreement is in force, neither Party shall directly solicit the other's employees, introduced through this project, to leave their employment. This clause does not stop either Party from working with any other client or business.`,
    plainExplanation:
      "While the project runs, neither side tries to poach the other's staff. It doesn't stop you from working for anyone else.",
    riskNotes:
      "Restrictions that continue after the contract ends are likely to be void in India, so this clause applies only during the Agreement. Never add a non-compete.",
    legalBasis:
      "Indian Contract Act, 1872, s. 27: agreements restraining anyone from exercising a lawful profession, trade or business are void.",
  },
  {
    id: "FSA-WAR-01",
    category: "warranties",
    title: "Warranties",
    include: "standard",
    text: `The Freelancer warrants that the Services will be performed with reasonable skill and care, and that the Deliverables are the Freelancer's original work and, to the Freelancer's knowledge, do not infringe anyone else's rights, except for material provided by the Client.`,
    plainExplanation:
      "You promise to do the work properly and that it's your own original work.",
    riskNotes:
      "An unlimited warranty could make the freelancer responsible for problems outside their control.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-LIA-01",
    category: "liability",
    title: "Limitation of Liability",
    include: "standard",
    text: `Neither Party is liable to the other for indirect or consequential losses, such as loss of profits or business. Each Party's total liability under this Agreement is limited to the total Fees. These limits do not apply to fraud, wilful misconduct or breach of the "Confidentiality" clause.`,
    plainExplanation:
      "If something goes wrong, the most either side can claim is the project's fee, except in cases of fraud or leaking secrets.",
    riskNotes:
      "Without a cap, a freelancer on a small project could face a claim far larger than their fee.",
    legalBasis:
      "Indian Contract Act, 1872, s. 73: compensation for breach covers losses arising naturally from the breach, not remote or indirect losses.",
  },
  {
    id: "FSA-IND-01",
    category: "indemnity",
    title: "Indemnity",
    include: "standard",
    text: `The Freelancer shall indemnify the Client against third-party claims that the Deliverables infringe their intellectual property rights, except to the extent caused by material the Client provided. The Client shall indemnify the Freelancer against third-party claims arising from material the Client provided or from the Client's use of the Deliverables in breach of this Agreement. The Party seeking indemnity must notify the other promptly and allow it to manage the defence.`,
    plainExplanation:
      "If someone outside the deal sues, the side responsible for the problem covers the costs.",
    riskNotes:
      "A one-sided indemnity can make one party pay for the other's mistakes.",
    legalBasis:
      "Indian Contract Act, 1872, ss. 124–125: a contract of indemnity and the rights of the person indemnified.",
  },
  {
    id: "FSA-TER-01",
    category: "termination",
    title: "Termination for Convenience",
    include: "standard",
    text: `Either Party may end this Agreement for any reason by giving the other {{noticeDays}} days' written notice.`,
    plainExplanation:
      "Either side can end the contract without a reason, with fair warning.",
    riskNotes:
      "Without a notice period, a project can be cancelled overnight, leaving the freelancer without planned income.",
    legalBasis: "General contract principles.",
  },
  {
    id: "FSA-TER-02",
    category: "termination",
    title: "Termination for Breach",
    include: "required",
    text: `Either Party may end this Agreement immediately by written notice if the other Party seriously breaches it and does not fix the breach within {{cureDays}} days of being told about it in writing. Failure by the Client to pay an undisputed invoice is a serious breach.`,
    plainExplanation:
      "If one side seriously breaks the deal and doesn't fix it after being warned, the other can end it. Not paying counts.",
    riskNotes:
      "Without a fix period, small problems can be used as an excuse to end the contract.",
    legalBasis:
      "Indian Contract Act, 1872, s. 39: when a party refuses to perform its promise in full, the other may put an end to the contract.",
  },
  {
    id: "FSA-TER-03",
    category: "termination",
    title: "Effect of Termination",
    include: "standard",
    text: `If this Agreement ends for any reason, the Client shall pay for all Milestones completed and for work done on the current Milestone up to the date of termination, in proportion to the work completed. Ownership passes to the Client only for Deliverables that have been paid for. Each Party shall return or delete the other's Confidential Information. The clauses on Ownership of Work, Confidentiality, Limitation of Liability, Indemnity, Dispute Resolution and Governing Law continue after termination.`,
    plainExplanation:
      "If the contract ends early, you're paid for the work already done, and the client owns only what they've paid for.",
    riskNotes:
      "Without this, a client could cancel just before a milestone is complete and pay nothing for it.",
    legalBasis:
      "Indian Contract Act, 1872, s. 70: a person who enjoys the benefit of work not intended to be free must pay for it.",
  },
  {
    id: "FSA-FM-01",
    category: "force-majeure",
    title: "Force Majeure",
    include: "standard",
    text: `Neither Party is liable for a delay or failure caused by events beyond its reasonable control, such as natural disasters, epidemics, war, riots or government action, as long as it tells the other Party promptly and tries to limit the effect. If such an event delays the Services for more than {{forceMajeureDays}} days, either Party may end this Agreement by written notice, and the "Effect of Termination" clause applies.`,
    plainExplanation:
      "Neither side is blamed for delays caused by things nobody can control. If it lasts too long, either can walk away fairly.",
    riskNotes:
      "Without this clause, parties must rely on the narrower legal doctrine of frustration.",
    legalBasis:
      "Indian Contract Act, 1872, s. 56: a contract to do an act that becomes impossible becomes void.",
  },
  {
    id: "FSA-DIS-01",
    category: "disputes",
    title: "Dispute Resolution",
    include: "required",
    text: `If a dispute arises, the Parties shall first try to resolve it through good-faith discussion for {{disputeTalkDays}} days, and may try mediation. If it is not resolved, it shall be referred to arbitration by a sole arbitrator appointed by agreement of the Parties, under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be {{jurisdictionCity}}, and the language shall be English. The award will be final and binding.`,
    plainExplanation:
      "Disagreements are settled by talking first. If that fails, a single neutral arbitrator decides, which is usually faster and cheaper than court.",
    riskNotes:
      "An arbitration clause must clearly name the seat. A sole arbitrator keeps costs low for small contracts.",
    legalBasis:
      "Arbitration and Conciliation Act, 1996, ss. 7, 10, 11, 20 and 22 (arbitration agreement, number of arbitrators, appointment, place and language); Indian Contract Act, 1872, s. 28, Exception 1 (arbitration agreements are valid).",
  },
  {
    id: "FSA-LAW-01",
    category: "law",
    title: "Governing Law and Jurisdiction",
    include: "required",
    text: `This Agreement is governed by the laws of India. Subject to the "Dispute Resolution" clause, the courts at {{jurisdictionCity}} have exclusive jurisdiction over matters arising from this Agreement.`,
    plainExplanation:
      "Indian law applies, and the courts of the chosen city handle anything that has to go to court.",
    riskNotes:
      "Parties can only choose a court that would otherwise have jurisdiction, for example where a party lives or works or where the contract is performed. Pick a city connected to the deal.",
    legalBasis:
      "Code of Civil Procedure, 1908, s. 20 (where suits may be filed); Indian Contract Act, 1872, s. 28.",
  },
  {
    id: "FSA-NOT-01",
    category: "notices",
    title: "Notices",
    include: "standard",
    text: `Formal notices under this Agreement must be in writing and sent by email to the Client at {{clientEmail}} and to the Freelancer at {{freelancerEmail}}, or to another address a Party gives by notice. A notice is treated as received on the next Business Day after it is sent.`,
    plainExplanation:
      "How official messages are sent. Email counts, so warnings and notices can't get lost.",
    riskNotes:
      "Without agreed addresses, a party can claim it never received a notice.",
    legalBasis:
      "Information Technology Act, 2000, ss. 4 and 13 (legal recognition of electronic records, and time of dispatch and receipt).",
  },
  {
    id: "FSA-GEN-01",
    category: "general",
    title: "General",
    include: "standard",
    text: `(a) This Agreement is the entire agreement between the Parties about its subject and replaces any earlier discussions.
(b) Any change to this Agreement must be in writing and agreed by both Parties.
(c) If any part of this Agreement is found invalid, the rest remains in force.
(d) Neither Party may transfer this Agreement or subcontract the Services without the other's written consent.
(e) Not enforcing a right immediately does not mean giving it up.`,
    plainExplanation:
      "Standard housekeeping: this document is the whole deal, changes must be in writing, and one bad clause doesn't sink the rest.",
    riskNotes:
      "Without an entire-agreement clause, old messages and promises can be argued to be part of the deal.",
    legalBasis: "Indian Contract Act, 1872, s. 62 (alteration of a contract) and general principles.",
  },
  {
    id: "FSA-SIG-01",
    category: "signatures",
    title: "Electronic Signatures",
    include: "standard",
    text: `This Agreement may be signed electronically, and in separate copies that together form one agreement. Electronic signatures and electronic records of this Agreement are as valid as handwritten signatures and paper copies.`,
    plainExplanation:
      "You can sign online. It's as valid as signing on paper.",
    riskNotes:
      "Some documents, such as property sale agreements, can't be signed electronically in India. Service agreements can.",
    legalBasis:
      "Information Technology Act, 2000, ss. 5 and 10A (legal recognition of electronic signatures, and validity of contracts formed electronically).",
  },
];
