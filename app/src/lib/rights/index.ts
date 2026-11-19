import { cardSchema, type SituationCard } from "./types";

import arrestRights from "./cards/arrest-rights.json";
import defectiveProductRefund from "./cards/defective-product-refund.json";
import depositNotReturned from "./cards/deposit-not-returned.json";
import drunkDriving from "./cards/drunk-driving.json";
import echallanDispute from "./cards/echallan-dispute.json";
import firRefusedZeroFir from "./cards/fir-refused-zero-fir.json";
import freeLegalAid from "./cards/free-legal-aid.json";
import harassmentOfWomen from "./cards/harassment-of-women.json";
import helmetViolation from "./cards/helmet-violation.json";
import illegalEviction from "./cards/illegal-eviction.json";
import noBillCashOnly from "./cards/no-bill-cash-only.json";
import policeNoticeQuestioning from "./cards/police-notice-questioning.json";
import salaryNotPaid from "./cards/salary-not-paid.json";
import seatbeltViolation from "./cards/seatbelt-violation.json";
import trafficStopDocuments from "./cards/traffic-stop-documents.json";
import upiOnlineFraud from "./cards/upi-online-fraud.json";
import womanArrestProtections from "./cards/woman-arrest-protections.json";

// Every situation card, checked against the schema when the app starts.
// To add a card: create cards/<id>.json, import it here, then run `npm run check:rights`.
const RAW: unknown[] = [
  arrestRights,
  defectiveProductRefund,
  depositNotReturned,
  drunkDriving,
  echallanDispute,
  firRefusedZeroFir,
  freeLegalAid,
  harassmentOfWomen,
  helmetViolation,
  illegalEviction,
  noBillCashOnly,
  policeNoticeQuestioning,
  salaryNotPaid,
  seatbeltViolation,
  trafficStopDocuments,
  upiOnlineFraud,
  womanArrestProtections,
];

export const RIGHTS_CARDS: SituationCard[] = RAW.map((card) => cardSchema.parse(card));

const BY_ID = new Map(RIGHTS_CARDS.map((card) => [card.id, card]));

export function getRightsCard(id: string): SituationCard | undefined {
  return BY_ID.get(id);
}

// A short list for the AI: only IDs, titles and example phrases. No legal text,
// so the AI has nothing to copy section numbers from.
export function cardMenu(): string {
  return RIGHTS_CARDS.map(
    (c) => `- ${c.id} (${c.category}): ${c.title}. e.g. "${c.triggers.slice(0, 3).join('", "')}"`,
  ).join("\n");
}

export type { SituationCard } from "./types";
