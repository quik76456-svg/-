import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode, sendLoginSms, storeLoginCode } from "@/server/auth/sms";
import { hitRateLimit } from "@/server/security/rateLimit";

const bodySchema = z.object({ phone: z.string().regex(/^1\d{10}$/) });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const json = await req.json();
  const { phone } = bodySchema.parse(json);

  const rl1 = await hitRateLimit(`sms:ip:${ip ?? "unknown"}`, 20, 3600);
  if (!rl1.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const rl2 = await hitRateLimit(`sms:phone:${phone}`, 5, 3600);
  if (!rl2.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const code = generateCode();
  await storeLoginCode(phone, code, ip);
  await sendLoginSms(phone, code);

  return NextResponse.json({ ok: true });
}
