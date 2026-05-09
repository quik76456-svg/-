import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { db } from "@/server/db";
import { putObject, getObject } from "@/server/providers/storage/oss";

export async function createExport(userId: string, versionId: string) {
  const version = await db.resumeVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("version_not_found");

  const resume = await db.resume.findUnique({ where: { id: version.resumeId } });
  if (!resume || resume.userId !== userId) throw new Error("not_found");

  const entitlement = await db.entitlement.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!entitlement || entitlement.remainingExports <= 0) throw new Error("no_entitlement");

  const templatePath = path.resolve(process.cwd(), "templates/default.docx");
  const template = await fs.readFile(templatePath);
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: "{", end: "}" } });
  doc.render(version.templateFieldsJson as unknown as Record<string, unknown>);
  const out = doc.getZip().generate({ type: "nodebuffer" });

  const downloadToken = randomUUID();
  const fileKey = `exports/${userId}/${versionId}/${Date.now()}.docx`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.$transaction(async (tx) => {
    const e = await tx.entitlement.findUnique({ where: { id: entitlement.id } });
    if (!e || e.remainingExports <= 0) throw new Error("no_entitlement");
    await tx.entitlement.update({ where: { id: e.id }, data: { remainingExports: e.remainingExports - 1 } });
    await tx.export.create({
      data: { versionId, format: "DOCX", templateId: "default", fileKey, downloadToken, expiresAt },
    });
  });

  await putObject(fileKey, out, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  return { downloadToken, expiresAt };
}

export async function downloadExport(userId: string, token: string) {
  const row = await db.export.findUnique({ where: { downloadToken: token } });
  if (!row) throw new Error("not_found");
  if (row.expiresAt.getTime() < Date.now()) throw new Error("expired");

  const version = await db.resumeVersion.findUnique({ where: { id: row.versionId } });
  if (!version) throw new Error("not_found");
  const resume = await db.resume.findUnique({ where: { id: version.resumeId } });
  if (!resume || resume.userId !== userId) throw new Error("not_found");

  const buf = await getObject(row.fileKey);
  return { buf, fileKey: row.fileKey };
}
