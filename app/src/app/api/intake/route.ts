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
import { dealSchema } from "@/lib/deal";

// Allow the AI up to 30 seconds to respond.
export const maxDuration = 30;

const INSTRUCTIONS = `You are Sage, an assistant that helps Indian freelancers turn a deal into a freelance service agreement.

Your job right now is ONLY to collect the deal details. Do not write the contract yet.

Every time the user gives you new or changed details, call the updateDeal tool.
- Fill in only what the user actually said. Use null for anything you don't know. Never guess names, amounts or dates.
- Amounts are in Indian rupees as plain numbers (e.g. 60000, not "60k").
- Dates are YYYY-MM-DD. If the user gives a date without a year, assume the next upcoming one.
- For milestones, always send the complete list.

After updating, reply in 1–3 short, friendly sentences:
- Confirm what you understood.
- Ask about ONE or TWO missing details at a time, most important first: client name, freelancer name, scope, total fee, milestones with amounts, start date, deadline, revision rounds, jurisdiction city.
- If milestone amounts don't add up to the total fee, point it out and ask which is right.
- When everything is filled in, say the details are complete and the user can review them on the right.

Use simple English. No legal jargon. You don't give legal advice.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5.4-mini"),
    instructions: INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    tools: {
      updateDeal: tool({
        description:
          "Save the deal details the user has given so far. Use null for anything unknown.",
        inputSchema: dealSchema,
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
