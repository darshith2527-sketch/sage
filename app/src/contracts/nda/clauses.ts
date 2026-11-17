import type { Clause } from "../types";

// Clause library for the Non-Disclosure Agreement (NDA), mutual or one-way.
// Written for Sage against Indian law. Not legal advice: these should be reviewed
// by a qualified lawyer before real-world use.
// "Disclosing Party" shares information; "Receiving Party" receives it. In a mutual NDA,
// each Party can be both.

export const ndaClauses: Clause[] = [
  {
    id: "NDA-PAR-01",
    category: "parties",
    title: "Parties",
    include: "required",
    onlyIf: { field: "ndaKind", equals: "mutual" },
    text: `This Mutual Non-Disclosure Agreement ("Agreement") is made on {{agreementDate}} between:

{{partyOneName}}, of {{partyOneAddress}}; and

{{partyTwoName}}, of {{partyTwoAddress}}.

Each is a "Party". Each Party may share Confidential Information (as the "Disclosing Party") and receive it (as the "Receiving Party"). Each Party confirms that it is legally able to enter into this Agreement and does so freely.`,
    plainExplanation:
      "Who is making the agreement. In a mutual NDA, both sides share secrets and both must protect them.",
    riskNotes:
      "If both sides will share information, a one-way NDA leaves one of them unprotected.",
    legalBasis:
      "Indian Contract Act, 1872, s. 10: an agreement is a contract when made by the free consent of parties competent to contract, for a lawful consideration and object.",
  },
  {
    id: "NDA-PAR-02",
    category: "parties",
    title: "Parties",
    include: "required",
    onlyIf: { field: "ndaKind", equals: "oneWay" },
    text: `This Non-Disclosure Agreement ("Agreement") is made on {{agreementDate}} between:

{{partyOneName}}, of {{partyOneAddress}} (the "Disclosing Party"); and

{{partyTwoName}}, of {{partyTwoAddress}} (the "Receiving Party").

Each is a "Party". Each Party confirms that it is legally able to enter into this Agreement and does so freely.`,
    plainExplanation:
      "Who is making the agreement. One side shares secrets; the other promises to protect them.",
    riskNotes:
      "Getting the roles backwards would protect the wrong side's information.",
    legalBasis:
      "Indian Contract Act, 1872, s. 10: an agreement is a contract when made by the free consent of parties competent to contract, for a lawful consideration and object.",
  },
  {
    id: "NDA-PUR-01",
    category: "purpose",
    title: "Purpose",
    include: "required",
    text: `The Parties wish to share information for the following purpose: {{purpose}} (the "Purpose").`,
    plainExplanation: "Why the information is being shared. It may only be used for this reason.",
    riskNotes:
      "Without a clear purpose, it's hard to show that information was misused for something else.",
    legalBasis:
      "Indian Contract Act, 1872, s. 29: agreements whose meaning is not certain, or capable of being made certain, are void.",
  },
  {
    id: "NDA-DEF-01",
    category: "definitions",
    title: "Confidential Information",
    include: "required",
    text: `"Confidential Information" means any information the Disclosing Party shares with the Receiving Party in connection with the Purpose, whether in writing, electronically, orally or by demonstration, that is marked as confidential or that a reasonable person would understand to be confidential. It includes business plans, financial information, customer and supplier details, pricing, technical information, software, designs and know-how.`,
    plainExplanation:
      "What counts as secret: anything marked confidential, or anything a sensible person would know is private.",
    riskNotes:
      "A definition that's too narrow leaves spoken or unmarked information unprotected; one that's too broad is hard to enforce.",
    legalBasis: "General contract principles.",
  },
  {
    id: "NDA-EXC-01",
    category: "definitions",
    title: "What Is Not Confidential",
    include: "required",
    text: `Confidential Information does not include information that the Receiving Party can show:
(a) is or becomes public, other than through a breach of this Agreement;
(b) was already lawfully known to it before it was shared;
(c) it developed independently, without using the Confidential Information; or
(d) it received lawfully from someone else who was free to share it.`,
    plainExplanation:
      "Information that's already public, already known, or created independently isn't covered.",
    riskNotes:
      "Without these standard exceptions, the Receiving Party could be blamed for using information it already had.",
    legalBasis: "General contract principles.",
  },
  {
    id: "NDA-OBL-01",
    category: "obligations",
    title: "Obligations of the Receiving Party",
    include: "required",
    text: `The Receiving Party shall:
(a) use the Confidential Information only for the Purpose;
(b) not share it with anyone except its employees, advisers and contractors who need it for the Purpose and are bound by confidentiality duties at least as strict as this Agreement; and
(c) protect it with at least the care it uses for its own confidential information, and never less than reasonable care.
The Receiving Party is responsible for any breach by the people it shares the Confidential Information with.`,
    plainExplanation:
      "The receiver may only use the information for the agreed purpose, share it only with people who need it, and must keep it safe.",
    riskNotes:
      "If the receiver isn't responsible for its own staff and advisers, a leak through them may go unremedied.",
    legalBasis: "General contract principles.",
  },
  {
    id: "NDA-LEG-01",
    category: "obligations",
    title: "Disclosure Required by Law",
    include: "standard",
    text: `The Receiving Party may disclose Confidential Information if required by law, a court or a regulator. Where lawful, it shall tell the Disclosing Party promptly beforehand, so the Disclosing Party can seek protection, and shall disclose only the part that is required.`,
    plainExplanation:
      "If a court or the law requires disclosure, that's allowed, but the other side must be told first where possible.",
    riskNotes:
      "Without this, a party could be in breach simply for obeying a court order.",
    legalBasis:
      "Indian Contract Act, 1872, s. 23: an agreement whose object would defeat the law is void, so the law must always be obeyed.",
  },
  {
    id: "NDA-PER-01",
    category: "privacy",
    title: "Personal Data",
    include: "standard",
    text: `If Confidential Information includes personal data about any individual, the Receiving Party shall process it only for the Purpose and in line with applicable data protection law, including the Digital Personal Data Protection Act, 2023.`,
    plainExplanation:
      "If the shared information includes details about people, it must be handled according to India's data protection law.",
    riskNotes:
      "Customer or employee data shared without data-protection terms can expose both parties to legal penalties.",
    legalBasis: "Digital Personal Data Protection Act, 2023.",
  },
  {
    id: "NDA-TER-01",
    category: "term",
    title: "Term",
    include: "required",
    text: `This Agreement starts on the date above and continues until either Party ends it by written notice. Either Party may stop sharing information at any time. The obligations in this Agreement continue for {{confidentialityPeriod}} after this Agreement ends.`,
    plainExplanation:
      "Either side can end the agreement, but the duty to keep secrets lasts for the agreed time afterwards.",
    riskNotes:
      "A confidentiality period with no end is harder to enforce; one that's too short may expire while the information is still valuable.",
    legalBasis: "General contract principles.",
  },
  {
    id: "NDA-RET-01",
    category: "return",
    title: "Return or Destruction",
    include: "standard",
    text: `When this Agreement ends, or when the Disclosing Party asks, the Receiving Party shall return or delete the Confidential Information and confirm this in writing. It may keep copies that the law requires it to keep, or that sit in routine electronic backups, but those copies remain protected by this Agreement.`,
    plainExplanation:
      "When the deal ends, the receiver must give back or delete the information, and confirm it.",
    riskNotes:
      "Without this, copies of sensitive information can stay with the other side indefinitely.",
    legalBasis: "General contract principles.",
  },
  {
    id: "NDA-NOL-01",
    category: "rights",
    title: "No Licence and No Obligation",
    include: "standard",
    text: `All Confidential Information remains the property of the Disclosing Party. This Agreement does not give the Receiving Party any licence or right in it, and does not oblige either Party to share any information or to enter into any further agreement. Confidential Information is shared "as is", without any promise that it is accurate or complete.`,
    plainExplanation:
      "Sharing secrets doesn't hand over ownership, and neither side is forced to sign any further deal.",
    riskNotes:
      "Without this, the receiver might argue it gained rights to use ideas or technology it was shown.",
    legalBasis: "General contract principles.",
  },
  {
    id: "NDA-REM-01",
    category: "remedies",
    title: "Remedies",
    include: "standard",
    text: `A breach of this Agreement may cause harm that money alone cannot fully repair. In addition to any other remedy, the Disclosing Party may ask a court for an injunction to stop or prevent a breach.`,
    plainExplanation:
      "If secrets are about to leak, the injured side can ask a court to stop it, not just claim money afterwards.",
    riskNotes:
      "Once confidential information is public, damages rarely undo the harm, so fast court orders matter.",
    legalBasis:
      "Specific Relief Act, 1963, ss. 37–38 (temporary and perpetual injunctions); Indian Contract Act, 1872, s. 73 (compensation for breach).",
  },
  {
    id: "NDA-DIS-01",
    category: "disputes",
    title: "Dispute Resolution",
    include: "required",
    text: `If a dispute arises, the Parties shall first try to resolve it through good-faith discussion for {{disputeTalkDays}} days, and may try mediation. If it is not resolved, it shall be referred to arbitration by a sole arbitrator appointed by agreement of the Parties, under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be {{jurisdictionCity}}, and the language shall be English. Nothing in this clause stops a Party from seeking urgent interim relief from a court.`,
    plainExplanation:
      "Disagreements are settled by talking first, then by a single arbitrator. Either side can still go to court urgently to stop a leak.",
    riskNotes:
      "For NDAs, the right to urgent court relief matters: arbitration can be too slow to stop a leak in progress.",
    legalBasis:
      "Arbitration and Conciliation Act, 1996, ss. 7, 9, 10, 11, 20 and 22 (arbitration agreement, interim measures by court, number and appointment of arbitrators, place and language).",
  },
  {
    id: "NDA-LAW-01",
    category: "law",
    title: "Governing Law and Jurisdiction",
    include: "required",
    text: `This Agreement is governed by the laws of India. Subject to the "Dispute Resolution" clause, the courts at {{jurisdictionCity}} have exclusive jurisdiction over matters arising from this Agreement.`,
    plainExplanation:
      "Indian law applies, and the courts of the chosen city handle anything that has to go to court.",
    riskNotes:
      "Parties can only choose a court that would otherwise have jurisdiction, so pick a city connected to the parties or the deal.",
    legalBasis:
      "Code of Civil Procedure, 1908, s. 20 (where suits may be filed); Indian Contract Act, 1872, s. 28.",
  },
  {
    id: "NDA-NOT-01",
    category: "notices",
    title: "Notices",
    include: "standard",
    text: `Formal notices under this Agreement must be in writing and sent by email to {{partyOneName}} at {{partyOneEmail}} and to {{partyTwoName}} at {{partyTwoEmail}}, or to another address a Party gives by notice. A notice is treated as received on the next working day after it is sent.`,
    plainExplanation: "How official messages are sent. Email counts.",
    riskNotes: "Without agreed addresses, a party can claim it never received a notice.",
    legalBasis:
      "Information Technology Act, 2000, ss. 4 and 13 (legal recognition of electronic records, and time of dispatch and receipt).",
  },
  {
    id: "NDA-GEN-01",
    category: "general",
    title: "General",
    include: "standard",
    text: `(a) This Agreement is the entire agreement between the Parties about its subject and replaces any earlier discussions.
(b) Any change to this Agreement must be in writing and agreed by both Parties.
(c) If any part of this Agreement is found invalid, the rest remains in force.
(d) Neither Party may transfer this Agreement without the other's written consent.
(e) This Agreement does not stop either Party from working with anyone else, as long as it does not use or share the other's Confidential Information.`,
    plainExplanation:
      "Standard housekeeping. It also makes clear that an NDA protects secrets but doesn't stop anyone from working elsewhere.",
    riskNotes:
      "Restraints on carrying on a business are void in India, so the NDA must protect information, not restrict work.",
    legalBasis:
      "Indian Contract Act, 1872, s. 27 (agreements in restraint of trade are void) and s. 62 (alteration of a contract).",
  },
  {
    id: "NDA-SIG-01",
    category: "signatures",
    title: "Electronic Signatures",
    include: "standard",
    text: `This Agreement may be signed electronically, and in separate copies that together form one agreement. Electronic signatures and electronic records of this Agreement are as valid as handwritten signatures and paper copies.`,
    plainExplanation: "You can sign online. It's as valid as signing on paper.",
    riskNotes: "Service and confidentiality agreements can be signed electronically in India.",
    legalBasis:
      "Information Technology Act, 2000, ss. 5 and 10A (legal recognition of electronic signatures, and validity of contracts formed electronically).",
  },
];
