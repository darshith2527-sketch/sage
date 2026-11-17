// Loan calculations, done in plain code so every number in the agreement is exact.
// All amounts are whole rupees.

export type Payment = { date: string; amount: number };

// Adds months to a YYYY-MM-DD date, keeping the day where possible:
// 31 January + 1 month → 28 (or 29) February, not 3 March.
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

// One payment on a date: principal plus simple interest for the days the money was lent.
export function lumpSumPayment(principal: number, annualRate: number, loanDate: string, repaymentDate: string): Payment {
  const days = daysBetween(loanDate, repaymentDate);
  const interest = Math.round((principal * annualRate * days) / (100 * 365));
  return { date: repaymentDate, amount: principal + interest };
}

// Equal monthly instalments (EMI) with interest on the reducing balance.
// Each instalment is rounded to the rupee; the last one absorbs the rounding
// so the loan is paid off exactly.
export function instalmentSchedule(
  principal: number,
  annualRate: number,
  count: number,
  firstDate: string,
): Payment[] {
  const monthlyRate = annualRate / 1200;
  const emi =
    monthlyRate === 0
      ? Math.round(principal / count)
      : Math.round((principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -count)));

  const payments: Payment[] = [];
  let balance = principal;
  for (let i = 0; i < count; i++) {
    const interest = balance * monthlyRate;
    const isLast = i === count - 1;
    const amount = isLast ? Math.round(balance + interest) : emi;
    balance = balance + interest - amount;
    payments.push({ date: addMonths(firstDate, i), amount });
  }
  return payments;
}

// ---------- Amount in words (Indian numbering: thousand, lakh, crore) ----------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(" ");
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

// 250000 → "Rupees Two Lakh Fifty Thousand only"
export function rupeesInWords(amount: number): string {
  let n = Math.round(amount);
  if (n === 0) return "Rupees Zero only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return `Rupees ${parts.join(" ")} only`;
}
