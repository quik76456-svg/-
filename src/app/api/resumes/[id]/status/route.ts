import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySession } from "@/server/auth/session";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ parseStatus: resume.parseStatus });
}
