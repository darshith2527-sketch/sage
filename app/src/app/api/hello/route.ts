import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function GET() {
  const { text } = await generateText({
    model: openai("gpt-5.4-mini"),
    prompt: "In one sentence, explain what a freelance service agreement is.",
  });

  return Response.json({ reply: text });
}