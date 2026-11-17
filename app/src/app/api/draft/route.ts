import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { assembleContract, checkContract, checkDeal } from "@/contracts/engine";
import { getContractType } from "@/contracts/registry";

export const maxDuration = 30;

// What the browser sends: the agreement type, the filled deal, and ticked optional clauses.
const requestSchema = z.object({
  type: z.string(),
  deal: z.record(z.string(), z.unknown()),
  optional: z.array(z.string()),
});

export async function POST(req: Request) {
  // 1. Check the request has the right shape and the type exists.
  const parsed = requestSchema.safeParse(await req.json());
  const type = parsed.success ? getContractType(parsed.data.type) : undefined;
  if (!parsed.success || !type) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // 2. Check the deal matches this type's fields exactly.
  const dealParsed = type.schema.safeParse(parsed.data.deal);
  if (!dealParsed.success) {
    return Response.json({ error: "The deal details are in the wrong format." }, { status: 400 });
  }
  const deal = dealParsed.data;

  // 3. Refuse to draft until the deal is complete and consistent.
  const { missing, problems } = checkDeal(type, deal);
  if (missing.length > 0 || problems.length > 0) {
    return Response.json({ error: "The deal isn't complete yet.", missing, problems }, { status: 422 });
  }

  // 4. Only accept optional clauses this type really has.
  const optional = parsed.data.optional.filter((id) =>
    type.clauses.some((c) => c.id === id && c.include === "optional"),
  );

  // 5. The one AI step, if this type has one (e.g. scope → deliverables).
  //    If anything goes wrong, the user's own words are used instead.
  const overrides: Record<string, string> = {};
  if (type.refine) {
    try {
      const { output } = await generateText({
        model: openai("gpt-5.4-mini"),
        output: Output.object({
          schema: z.object({
            items: z.array(z.string()).describe("Each item as one short, specific line"),
          }),
        }),
        instructions: type.refine.instructions,
        prompt: type.refine.prompt(deal),
      });
      if (output.items.length > 0) {
        overrides[type.refine.placeholder] = output.items.map((item) => `• ${item}`).join("\n");
      }
    } catch (error) {
      console.error("Refine step failed, using the original text:", error);
    }
  }

  // 6. Assemble from the clause library, then check the result in code.
  const today = new Date().toISOString().slice(0, 10);
  const contract = assembleContract(type, deal, optional, today, overrides);
  const contractProblems = checkContract(type, contract);
  if (contractProblems.length > 0) {
    return Response.json({ error: "The contract failed its checks.", problems: contractProblems }, { status: 500 });
  }

  return Response.json({ contract });
}
