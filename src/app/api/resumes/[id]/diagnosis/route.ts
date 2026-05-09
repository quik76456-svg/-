import { NextResponse } from "next/server";
import { verifySession } from "@/server/auth/session";
import { db } from "@/server/db";
import { diagnoseResume } from "@/server/ai/diagnose";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (resume.parseStatus !== "DONE") return NextResponse.json({ error: "not_ready" }, { status: 409 });

  const diagnosis = await diagnoseResume(id);
  return NextResponse.json({ diagnosis });
}

