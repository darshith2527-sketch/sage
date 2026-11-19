import { openai } from "@ai-sdk/openai";
import { createRightsHandler } from "@/lib/rights/handler";

// Know Your Rights chat. All the logic (limits, validation, instructions, the showRights
// tool and its code checks) lives in src/lib/rights/handler.ts, so tests can run it with a mock AI.

// Allow the AI up to 30 seconds to respond.
export const maxDuration = 30;

export const POST = createRightsHandler(openai("gpt-5.4-mini"));
