import { db } from "@/server/db";

export async function assertCanGenerate(userId: string) {
  const e = await db.entitlement.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!e || e.remainingGenerations <= 0) throw new Error("no_entitlement");
  return e;
}

export async function createQaSession(resumeId: string) {
  return db.qaSession.create({ data: { resumeId, status: "ACTIVE" } });
}

