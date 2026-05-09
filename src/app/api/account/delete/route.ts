import { NextResponse } from "next/server";
import { verifySession } from "@/server/auth/session";
import { db } from "@/server/db";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ ok: true });

  await db.$transaction(async (tx) => {
    await tx.qaMessage.deleteMany({ where: { session: { resume: { userId } } } });
    await tx.export.deleteMany({ where: { version: { resume: { userId } } } });
    await tx.resumeVersion.deleteMany({ where: { resume: { userId } } });
    await tx.diagnosis.deleteMany({ where: { resume: { userId } } });
    await tx.qaSession.deleteMany({ where: { resume: { userId } } });
    await tx.resume.deleteMany({ where: { userId } });
    await tx.order.deleteMany({ where: { userId } });
    await tx.entitlement.deleteMany({ where: { userId } });
    await tx.authSession.deleteMany({ where: { userId } });
    await tx.authSmsCode.deleteMany({ where: { phone: user.phone } });
    await tx.user.delete({ where: { id: userId } });
  });

  return NextResponse.json({ ok: true });
}

