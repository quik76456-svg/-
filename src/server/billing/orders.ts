import { db } from "@/server/db";
import type { Prisma, PrismaClient } from "@prisma/client";

export async function createOrder(userId: string, planId: string) {
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new Error("plan_not_found");
  return db.order.create({
    data: { userId, planId, amountCny: plan.amountCny, status: "PENDING_PAY" },
  });
}

export async function markOrderPaid(
  orderId: string,
  provider: "ALIPAY" | "WECHAT",
  providerTradeNo: string,
  amountCny: number,
  prisma: PrismaClient | Prisma.TransactionClient = db,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("order_not_found");
  if (order.amountCny !== amountCny) throw new Error("amount_mismatch");
  if (order.status === "PAID" || order.status === "FULFILLED") return order;

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "PAID", provider, providerTradeNo, paidAt: new Date() },
  });
}
