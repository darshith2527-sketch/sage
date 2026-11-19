import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { mergeFindings, REVIEW_INSTRUCTIONS, reviewSchema, verifyRisks } from "@/review/analysis";
import { extractText, MAX_FILE_BYTES, MAX_TEXT_CHARS, normalise } from "@/review/extract";
import { runRules } from "@/review/rules";
import { rateLimit } from "@/lib/rate-limit";

// Reading a whole agreement takes longer than a chat reply.
export const maxDuration = 60;

export async function POST(req: Request) {
  // Per-IP limit, so nobody can drain the AI credit.
  const limited = await rateLimit(req, "review");
  if (limited) return limited;

  // 1. Read the form: either an uploaded file or pasted text, plus the user's side.
  const form = await req.formData();
  const file = form.get("file");
  const pasted = String(form.get("text") ?? "");
  const side = String(form.get("side") ?? "").slice(0, 200).trim();

  let text: string;
  let source = "Pasted text";
  try {
    if (file instanceof File && file.size > 0) {
      source = file.name;
      if (file.size > MAX_FILE_BYTES) {
        return Response.json({ error: "The file is too large. Please upload a file under 4 MB." }, { status: 413 });
      }
      text = await extractText(file);
    } else {
      text = pasted;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't read the file.";
    return Response.json({ error: message }, { status: 400 });
  }

  text = text.trim();
  if (normalise(text).length < 200) {
    return Response.json(
      { error: "Couldn't find enough text to review. Scanned PDFs (photos of paper) aren't supported yet." },
      { status: 400 },
    );
  }
  const truncated = text.length > MAX_TEXT_CHARS;
  if (truncated) text = text.slice(0, MAX_TEXT_CHARS);

  // The first line, so the user can see which document this review is for.
  const firstLine = (text.split("\n").find((line) => line.trim()) ?? "").trim().slice(0, 100);

  // 2. Code checks for common Indian-law issues. No AI involved.
  // Run on normalised text so positions line up with the AI's quotes in step 4.
  const doc = normalise(text);
  const order = { high: 0, medium: 1, low: 2 };
  const findings = runRules(doc);

  // 3. The AI reads the agreement from the user's side.
  let output;
  try {
    ({ output } = await generateText({
      model: openai("gpt-5.4"),
      output: Output.object({ schema: reviewSchema }),
      instructions: REVIEW_INSTRUCTIONS,
      prompt: `The user's side: ${side || "not stated — review it neutrally"}\n\nAGREEMENT:\n${text}`,
    }));
  } catch (error) {
    console.error("Review failed:", error);
    return Response.json({ error: "The review failed. Please try again." }, { status: 502 });
  }

  // 4. Code check on the AI: every risk must quote real text from the document.
  const risks = verifyRisks(doc, output.risks);
  risks.sort((a, b) => order[a.severity] - order[b.severity]);

  // 5. Code checks that found the same clause become a "confirmed by" tag on the AI card.
  const ruleFindings = mergeFindings(risks, findings).sort((a, b) => order[a.severity] - order[b.severity]);

  return Response.json({
    review: {
      source,
      firstLine,
      documentType: output.documentType,
      summary: output.summary,
      // Positions are only needed on the server.
      risks: risks
        .filter((r) => r.verified)
        .map((r) => ({ ...r, start: undefined, end: undefined, verified: undefined })),
      unverifiedCount: risks.filter((r) => !r.verified).length,
      missing: output.missing,
      ruleFindings,
      truncated,
    },
  });
}
