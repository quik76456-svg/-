import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/auth/session";
import { db } from "@/server/db";
import { generateResumeVersion } from "@/server/ai/generate";

const postSchema = z.object({ sessionId: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const json = await req.json();
  const { sessionId } = postSchema.parse(json);
  const session = await db.qaSession.findUnique({ where: { id: sessionId } });
  if (!session || session.resumeId !== id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await db.resumeVersion.findFirst({ where: { resumeId: id, sessionId } });
  if (existing) return NextResponse.json({ versionId: existing.id });

  const entitlement = await db.entitlement.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!entitlement || entitlement.remainingGenerations <= 0) return NextResponse.json({ error: "no_entitlement" }, { status: 403 });

  const version = await db.$transaction(async (tx) => {
    const e = await tx.entitlement.findUnique({ where: { id: entitlement.id } });
    if (!e || e.remainingGenerations <= 0) throw new Error("no_entitlement");

    await tx.entitlement.update({ where: { id: e.id }, data: { remainingGenerations: e.remainingGenerations - 1 } });

    const generated = await generateResumeVersion(id, sessionId);
    return tx.resumeVersion.create({
      data: { resumeId: id, sessionId, versionJson: generated.versionJson, templateFieldsJson: generated.templateFieldsJson },
    });
  });

  return NextResponse.json({ versionId: version.id });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const versions = await db.resumeVersion.findMany({ where: { resumeId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ versions });
}

