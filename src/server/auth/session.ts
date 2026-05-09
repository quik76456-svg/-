import { SignJWT, jwtVerify } from "jose";
import { env } from "@/server/env";
import { db } from "@/server/db";
import { randomUUID } from "node:crypto";

function secret() {
  return new TextEncoder().encode(env.AUTH_JWT_SECRET);
}

export async function createSession(userId: string) {
  const jti = randomUUID();
  await db.authSession.create({ data: { userId, tokenJti: jti } });

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setJti(jti)
    .sign(secret());

  return token;
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  const userId = payload.sub;
  const jti = payload.jti;
  if (!userId || !jti) throw new Error("invalid_token");

  const row = await db.authSession.findUnique({ where: { tokenJti: jti } });
  if (!row || row.revokedAt) throw new Error("revoked");
  return { userId };
}
