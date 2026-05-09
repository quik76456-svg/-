import { db } from "@/server/db";
import type { Prisma, PrismaClient } from "@prisma/client";

export async function grantPlanEntitlement(
  userId: string,
  planId: string,
  prisma: PrismaClient | Prisma.TransactionClient = db,
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("plan_not_found");
  const limits = plan.limitsJson as unknown as { generations?: unknown; exports?: unknown; jdCustomizations?: unknown };

  return prisma.entitlement.create({
    data: {
      userId,
      planId,
      remainingGenerations: Number(limits.generations ?? 0),
      remainingExports: Number(limits.exports ?? 0),
      remainingJdCustomizations: Number(limits.jdCustomizations ?? 0),
    },
  });
}
