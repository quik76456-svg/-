import { db } from "@/server/db";
import { getObject } from "@/server/providers/storage/oss";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export async function parseResumeText(sourceFileKey: string) {
  const buffer = await getObject(sourceFileKey);

  const lower = sourceFileKey.toLowerCase();
  if (lower.endsWith(".txt")) return buffer.toString("utf-8");
  if (lower.endsWith(".pdf")) {
    const parser = new PDFParse({});
    await parser.load(buffer);
    return await parser.getText();
  }
  if (lower.endsWith(".docx")) {
    const out = await mammoth.extractRawText({ buffer });
    return out.value;
  }
  throw new Error("unsupported_file_type");
}

export async function runParseJob(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new Error("resume_not_found");
  await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "PARSING" } });

  try {
    const text = await parseResumeText(resume.sourceFileKey);
    await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "DONE", parsedText: text } });
  } catch (e) {
    await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "FAILED" } });
    throw e;
  }
}
