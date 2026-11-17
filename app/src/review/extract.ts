import mammoth from "mammoth";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

// Uploads larger than this are refused (Vercel's limit for a request is about 4.5 MB).
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Longer documents are cut, so the AI review stays fast and affordable.
export const MAX_TEXT_CHARS = 60_000;

// Reads the text out of an uploaded PDF, Word (.docx) or plain-text file.
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text;
  }
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return new TextDecoder().decode(bytes);
  }
  throw new Error("Please upload a PDF, Word (.docx) or text file.");
}

// Collapses runs of spaces and blank lines so quotes can be matched reliably.
export function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
