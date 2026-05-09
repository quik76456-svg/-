import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { hashCode } from "@/server/auth/sms";

const bodySchema = z.object({ phone: z.string().regex(/^1\d{10}$/), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const json = await req.json();
  const { phone, code } = bodySchema.parse(json);

  const row = await db.authSmsCode.findFirst({
    where: { phone, scene: "LOGIN" },
    orderBy: { sentAt: "desc" },
  });
  if (!row) return NextResponse.json({ error: "code_not_found" }, { status: 400 });
  if (row.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "code_expired" }, { status: 400 });
  if (row.codeHash !== hashCode(code)) return NextResponse.json({ error: "code_invalid" }, { status: 400 });

  const user = await db.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });
  const token = await createSession(user.id);

  return NextResponse.json({ token });
}
