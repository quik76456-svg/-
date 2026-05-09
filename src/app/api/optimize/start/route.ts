import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/auth/session";
import { db } from "@/server/db";
import { assertCanGenerate, createQaSession } from "@/server/ai/session";
import { expScript, gradScript } from "@/server/ai/scripts";

const bodySchema = z.object({ resumeId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { resumeId } = bodySchema.parse(json);

  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await assertCanGenerate(userId);
  const session = await createQaSession(resumeId);

  const script = resume.identityType === "GRAD" ? gradScript : expScript;
  const first = script[0];
  if (first) await db.qaMessage.create({ data: { sessionId: session.id, role: "assistant", content: first.question } });

  return NextResponse.json({ sessionId: session.id, question: first?.question ?? "" });
}

