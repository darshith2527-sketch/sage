import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { getContractType } from "@/contracts/registry";

// Allow the AI up to 30 seconds to respond.
export const maxDuration = 30;

export async function POST(req: Request) {
  // Which agreement type? It comes in the URL: /api/intake?type=freelance
  const type = getContractType(new URL(req.url).searchParams.get("type") ?? "");
  if (!type) {
    return Response.json({ error: "Unknown agreement type." }, { status: 400 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5.4-mini"),
    instructions: type.intakeInstructions,
    messages: await convertToModelMessages(messages),
    tools: {
      updateDeal: tool({
        description: "Save the deal details the user has given so far. Use null for anything unknown.",
        inputSchema: type.schema,
        // The form on the page reads the input directly, so the server just confirms.
        execute: async () => ({ saved: true }),
      }),
    },
    // Step 1: the AI updates the deal. Step 2: it replies to the user.
    stopWhen: isStepCount(3),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
