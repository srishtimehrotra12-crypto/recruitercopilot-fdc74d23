import { extractTextFromPdf } from "./pdfParser";

export type SupportedExt = "pdf" | "txt" | "docx" | "doc";

export function getFileKind(file: File): SupportedExt | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "text/plain" || name.endsWith(".txt")) return "txt";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".doc")) return "doc";
  return null;
}

async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as any).extractRawText({ arrayBuffer });
  return (result?.value || "").trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const kind = getFileKind(file);
  if (!kind) throw new Error("Unsupported file type. Use PDF, TXT, or DOC/DOCX.");
  if (kind === "pdf") return extractTextFromPdf(file);
  if (kind === "txt") return await file.text();
  if (kind === "docx") return extractTextFromDocx(file);
  // Legacy .doc binary format cannot be parsed reliably in the browser
  throw new Error("Legacy .doc files aren't supported in-browser. Please save as .docx or PDF and re-upload.");
}

export const ACCEPTED_FILE_EXTS = ".pdf,.txt,.doc,.docx";
