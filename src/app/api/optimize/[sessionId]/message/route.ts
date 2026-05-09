import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/auth/session";
import { db } from "@/server/db";
import { expScript, gradScript } from "@/server/ai/scripts";

const bodySchema = z.object({ content: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { content } = bodySchema.parse(json);

  const session = await db.qaSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const resume = await db.resume.findUnique({ where: { id: session.resumeId } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.qaMessage.create({ data: { sessionId, role: "user", content } });

  const script = resume.identityType === "GRAD" ? gradScript : expScript;
  const userCount = await db.qaMessage.count({ where: { sessionId, role: "user" } });

  const next = script[userCount];
  if (next) {
    await db.qaMessage.create({ data: { sessionId, role: "assistant", content: next.question } });
    return NextResponse.json({ done: false, nextQuestion: next.question });
  }

  const messages = await db.qaMessage.findMany({ where: { sessionId, role: "user" }, orderBy: { createdAt: "asc" } });
  const answers: Record<string, string> = {};
  for (let i = 0; i < script.length; i++) {
    const key = script[i]?.key;
    const msg = messages[i]?.content;
    if (key && typeof msg === "string") answers[key] = msg;
  }

  const version = await db.resumeVersion.create({
    data: { resumeId: resume.id, sessionId, versionJson: { answers }, templateFieldsJson: { answers } },
  });
  await db.qaSession.update({ where: { id: sessionId }, data: { status: "DONE", endedAt: new Date() } });

  return NextResponse.json({ done: true, versionId: version.id });
}

