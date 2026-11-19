import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { cardMenu } from "./index";
import { checkCardIds } from "./guard";

// The Know Your Rights chat. The API route passes the real OpenAI model;
// scripts/test-rights.ts passes a mock, so every rule here can be tested without credits.

export const MAX_MESSAGE_CHARS = 1000; // one user message
const MAX_HISTORY = 20; // messages kept from the conversation

// What the AI may send to the page: card IDs only. Every field is nullable for strict mode.
const showRightsInput = z.object({
  cardIds: z
    .array(z.string())
    .max(3)
    .describe(
      "IDs of the situation cards that apply, best match first. Empty if none apply or you are asking a question.",
    ),
  userAtFault: z
    .boolean()
    .nullable()
    .describe(
      "true if the law is against the user here, false if the law is on their side, null if unclear",
    ),
  clarifyingQuestion: z
    .string()
    .max(200)
    .nullable()
    .describe(
      "The one question you are asking because a key fact is missing, or null",
    ),
});

export const INSTRUCTIONS = `You are Sage's "Know Your Rights" helper for ordinary people in India who are in a situation right now.
You talk like a calm, level-headed friend who knows the law. You give legal information, not legal advice.

HOW YOU WORK
- Sage has a library of verified "situation cards" (listed below). Each card already contains the exact laws, plain explanations, steps, helplines and escalation routes, checked by people.
- Before you give any legal information, call the showRights tool ONCE, with the IDs of all the cards that apply (at most 3, best first). Only use IDs from the list. Never invent an ID. Don't add "free-legal-aid" just to mention legal aid: the page always shows 15100.
- The page shows the laws from those cards. So you NEVER write an Act name with a section or article number, never write section numbers, article numbers, rule numbers or fine amounts yourself. Say "the law is in the card below" instead.
- If no card fits, say Sage doesn't have verified information on this yet, call showRights with ["free-legal-aid"], and point them to free legal aid on 15100.

YOUR REPLY (short, like a chat message, no headings, no walls of text)
1. One calm line on what's happening.
2. "Right now:" then 2 to 4 short practical steps for this exact situation, based on the card's steps.
3. An honest verdict. If the user is at fault (for example riding without a helmet, or driving after drinking), say so plainly and kindly: "This one's on you: the fine is lawful. Pay it through the official challan and keep the receipt." Never take the user's side just to please them. Set userAtFault accordingly.
4. "If it goes further:" one line on where to escalate (the card shows details).
5. End with: "Legal information, not legal advice. Free legal aid: 15100."

ASKING FIRST
- If a key fact is missing and it changes the answer (e.g. "Were you wearing a helmet?", "Do you have your licence in DigiLocker?", "Did you share an OTP?"), ask ONE short question first. Call showRights with cardIds [] and clarifyingQuestion set to that question, and give no verdict yet.

TONE
- Calm, short sentences. No alarming words, no ALL CAPS, no exclamation marks, no "you could be arrested".
- Reply in the user's language and script: Hindi in, Hindi out; Hinglish in, Hinglish out; English in, English out.

SAFETY (never break these)
- Never advise resisting, arguing with or running from police, bribing anyone, or destroying or hiding evidence. Never help anyone avoid or beat a lawful check such as a breath test.
- If the message suggests danger (violence, threats, a medical emergency, a woman detained at night, a child involved), your FIRST line is: call 112 now. Add 181 for women or 1098 for a child. Then the rights.
- Out of scope (non-Indian law, help with fraud or anything illegal, detailed court strategy): say so briefly and kindly, call showRights with ["free-legal-aid"], and point them to a lawyer or free legal aid.
- Always make sure the free legal aid route (15100) is mentioned.

SITUATION CARDS (id (category): title, example phrases)
${cardMenu()}`;

// One message from the page: we only accept text parts from the user.
const requestSchema = z.object({
  messages: z
    .array(
      z.custom<UIMessage>(
        (m) => typeof m === "object" && m !== null && "role" in m,
      ),
    )
    .min(1)
    .max(60),
});

export function createRightsHandler(model: LanguageModel) {
  return async function handle(req: Request): Promise<Response> {
    // 1. Per-IP limit, so nobody can drain the AI credit.
    const limited = await rateLimit(req, "rights");
    if (limited) return limited;

    // 2. Validate the request and cap message length.
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: "Invalid request." }, { status: 400 });
    const messages = parsed.data.messages.slice(-MAX_HISTORY);
    const last = messages[messages.length - 1];
    const lastText =
      last?.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
    if (last?.role !== "user" || !lastText.trim()) {
      return Response.json(
        { error: "Please type your situation." },
        { status: 400 },
      );
    }
    if (lastText.length > MAX_MESSAGE_CHARS) {
      return Response.json(
        {
          error: `Please keep it under ${MAX_MESSAGE_CHARS} characters. A few sentences is enough.`,
        },
        { status: 413 },
      );
    }

    // 3. The AI picks cards; code checks the IDs and the page renders the law from the library.
    const result = streamText({
      model,
      instructions: INSTRUCTIONS,
      messages: await convertToModelMessages(messages),
      tools: {
        showRights: tool({
          description:
            "Show the user the verified situation cards that apply. The page renders the laws from these cards. Only use IDs from the list.",
          inputSchema: showRightsInput,
          execute: async ({ cardIds, userAtFault, clarifyingQuestion }) =>
            checkCardIds(cardIds, userAtFault, clarifyingQuestion),
        }),
      },
      // Step 1: pick cards. Step 2: write the reply.
      stopWhen: isStepCount(3),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  };
}
