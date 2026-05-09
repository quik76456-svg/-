import { db } from "@/server/db";

export async function grantPlanEntitlement(userId: string, planId: string) {
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("plan_not_found");
  const limits = plan.limitsJson as unknown as { generations?: unknown; exports?: unknown; jdCustomizations?: unknown };

  return db.entitlement.create({
    data: {
      userId,
      planId,
      remainingGenerations: Number(limits.generations ?? 0),
      remainingExports: Number(limits.exports ?? 0),
      remainingJdCustomizations: Number(limits.jdCustomizations ?? 0),
    },
  });
}

