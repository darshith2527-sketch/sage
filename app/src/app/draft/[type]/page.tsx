import { notFound } from "next/navigation";
import { CONTRACT_TYPES, getContractType } from "@/contracts/registry";
import DraftClient from "../draft-client";

// Build one page per agreement type ahead of time: /draft/freelance, /draft/nda, …
export function generateStaticParams() {
  return CONTRACT_TYPES.map((t) => ({ type: t.id }));
}

export default async function DraftPage({ params }: PageProps<"/draft/[type]">) {
  const { type } = await params;
  // An unknown type (e.g. /draft/banana) shows the 404 page.
  if (!getContractType(type)) notFound();
  return <DraftClient typeId={type} />;
}
