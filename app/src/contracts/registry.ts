import { freelance } from "./freelance";
import type { ContractType } from "./types";

// Every agreement type Sage can draft. To add a new type, create its folder
// (like ./freelance) and add it to this list.
export const CONTRACT_TYPES: ContractType[] = [freelance];

export function getContractType(id: string): ContractType | undefined {
  return CONTRACT_TYPES.find((t) => t.id === id);
}
