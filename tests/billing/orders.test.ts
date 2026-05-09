import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createOrder, markOrderPaid } from "@/server/billing/orders";

describe("orders", () => {
  it("creates order for active plan", async () => {
    const user = await db.user.create({ data: { phone: `132${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({ data: { name: `Plan-${Date.now()}`, amountCny: 100, limitsJson: {}, isActive: true } });
    const order = await createOrder(user.id, plan.id);
    expect(order.status).toBe("PENDING_PAY");
    expect(order.amountCny).toBe(100);
  });

  it("marks order paid idempotently and validates amount", async () => {
    const user = await db.user.create({ data: { phone: `131${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({ data: { name: `Plan2-${Date.now()}`, amountCny: 200, limitsJson: {}, isActive: true } });
    const order = await createOrder(user.id, plan.id);

    const paid = await markOrderPaid(order.id, "ALIPAY", "T1", 200);
    expect(paid.status).toBe("PAID");

    const paidAgain = await markOrderPaid(order.id, "ALIPAY", "T1", 200);
    expect(paidAgain.status).toBe("PAID");

    await expect(markOrderPaid(order.id, "ALIPAY", "T1", 201)).rejects.toThrow();
  });
});

