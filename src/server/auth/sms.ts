import { createHash, randomInt } from "node:crypto";
import { env } from "@/server/env";
import { db } from "@/server/db";

export function generateCode() {
  return `${randomInt(0, 1000000)}`.padStart(6, "0");
}

export function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function storeLoginCode(phone: string, code: string, ip?: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.authSmsCode.create({
    data: {
      phone,
      codeHash: hashCode(code),
      expiresAt,
      ip,
      scene: "LOGIN",
    },
  });
  return { expiresAt };
}

export async function sendLoginSms(phone: string, code: string) {
  void env.SMS_ALIYUN_ACCESS_KEY_ID;
  void env.SMS_ALIYUN_ACCESS_KEY_SECRET;
  void env.SMS_ALIYUN_SIGN_NAME;
  void env.SMS_ALIYUN_TEMPLATE_CODE_LOGIN;
  void phone;
  void code;

  throw new Error("Not implemented: integrate Aliyun SMS SDK send");
}
