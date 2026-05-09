import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { markOrderPaid } from "@/server/billing/orders";
import { grantPlanEntitlement } from "@/server/billing/entitlements";
import { alipayProvider } from "@/server/providers/payments/alipay";

export async function POST(req: Request) {
  try {
    const { orderId, providerTradeNo, amountCny } = await alipayProvider.verifyAndParseNotify(req);

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

    await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (!current) throw new Error("order_not_found");

      if (current.status !== "FULFILLED") {
        const paid = await markOrderPaid(orderId, "ALIPAY", providerTradeNo, amountCny, tx);
        if (paid.status !== "FULFILLED") {
          await tx.order.update({ where: { id: orderId }, data: { status: "FULFILLED" } });
        }
      }

      const exists = await tx.entitlement.findFirst({ where: { userId: current.userId, planId: current.planId } });
      if (!exists) await grantPlanEntitlement(current.userId, current.planId, tx);
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    void e;
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}
