import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { checkDeal, dealSchema } from "@/lib/deal";
import { assembleContract, checkContract, OPTIONAL_CLAUSES } from "@/lib/draft";

export const maxDuration = 30;

// What the browser sends: the filled deal, plus which optional clauses to add.
const requestSchema = z.object({
  deal: dealSchema,
  optional: z.array(z.string()),
});

// The AI's only job: turn the user's scope into a clear list of deliverables.
const scopeSchema = z.object({
  deliverables: z
    .array(z.string())
    .describe("Each deliverable as one short, specific line"),
});

export async function POST(req: Request) {
  // 1. Check the request has the right shape.
  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { deal, optional } = parsed.data;

  // 2. Refuse to draft until the deal is complete and consistent.
  const { missing, problems } = checkDeal(deal);
  if (missing.length > 0 || problems.length > 0) {
    return Response.json(
      { error: "The deal isn't complete yet.", missing, problems },
      { status: 422 },
    );
  }

  // 3. Only accept optional clauses that really exist.
  const validOptional = optional.filter((id) => OPTIONAL_CLAUSES.some((c) => c.id === id));

  // 4. Ask the AI to turn the scope into clear deliverables.
  //    If anything goes wrong, fall back to the user's own words.
  let scopeText = deal.scope ?? "";
  try {
    const { output } = await generateText({
      model: openai("gpt-5.4-mini"),
      output: Output.object({ schema: scopeSchema }),
      instructions: `You turn a freelancer's description of their work into a clear list of deliverables for a contract.
Rules:
- Use only what the description says. Never add work, quantities, technologies or deadlines that aren't mentioned.
- 2 to 6 deliverables, each one short and specific.
- Plain English, no legal language, no prices or dates.`,
      prompt: `Work description: ${deal.scope}\nMilestones: ${(deal.milestones ?? [])
        .map((m) => m.title)
        .join(", ")}`,
    });
    if (output.deliverables.length > 0) {
      scopeText = output.deliverables.map((d) => `• ${d}`).join("\n");
    }
  } catch (error) {
    console.error("Scope rewrite failed, using the original scope:", error);
  }

  // 5. Assemble the contract from the clause library, then check it in code.
  const today = new Date().toISOString().slice(0, 10);
  const contract = assembleContract(deal, scopeText, validOptional, today);
  const contractProblems = checkContract(contract);
  if (contractProblems.length > 0) {
    return Response.json(
      { error: "The contract failed its checks.", problems: contractProblems },
      { status: 500 },
    );
  }

  return Response.json({ contract });
}
