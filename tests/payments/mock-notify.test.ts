import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { db } from "@/server/db";
import { createOrder } from "@/server/billing/orders";
import { env } from "@/server/env";
import { POST as alipayNotify } from "@/app/api/payments/alipay/notify/route";
import { POST as wechatNotify } from "@/app/api/payments/wechat/notify/route";

function sign(orderId: string, tradeNo: string, amountCny: number) {
  return createHmac("sha256", env.AUTH_JWT_SECRET).update(`${orderId}.${tradeNo}.${amountCny}`).digest("hex");
}

describe("payment notify (mock)", () => {
  it("marks order fulfilled and grants entitlement idempotently", async () => {
    const user = await db.user.create({ data: { phone: `130${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({
      data: { name: `Plan-${Date.now()}`, amountCny: 100, limitsJson: { generations: 1, exports: 1, jdCustomizations: 0 }, isActive: true },
    });
    const order = await createOrder(user.id, plan.id);

    const body = { orderId: order.id, tradeNo: "T-1", amountCny: 100, sign: sign(order.id, "T-1", 100) };
    const req = new Request("http://localhost/api/payments/alipay/notify", { method: "POST", body: JSON.stringify(body) });
    const res1 = await alipayNotify(req);
    expect(res1.status).toBe(200);

    const updated1 = await db.order.findUnique({ where: { id: order.id } });
    expect(updated1?.status).toBe("FULFILLED");

    const ent1 = await db.entitlement.findMany({ where: { userId: user.id, planId: plan.id } });
    expect(ent1.length).toBe(1);

    const req2 = new Request("http://localhost/api/payments/alipay/notify", { method: "POST", body: JSON.stringify(body) });
    const res2 = await alipayNotify(req2);
    expect(res2.status).toBe(200);

    const ent2 = await db.entitlement.findMany({ where: { userId: user.id, planId: plan.id } });
    expect(ent2.length).toBe(1);
  });

  it("returns 400 when signature is invalid", async () => {
    const user = await db.user.create({ data: { phone: `129${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({ data: { name: `Plan2-${Date.now()}`, amountCny: 100, limitsJson: {}, isActive: true } });
    const order = await createOrder(user.id, plan.id);

    const body = { orderId: order.id, tradeNo: "T-2", amountCny: 100, sign: "bad" };
    const req = new Request("http://localhost/api/payments/alipay/notify", { method: "POST", body: JSON.stringify(body) });
    const res = await alipayNotify(req);
    expect(res.status).toBe(400);
  });

  it("supports wechat notify flow", async () => {
    const user = await db.user.create({ data: { phone: `128${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({
      data: { name: `Plan3-${Date.now()}`, amountCny: 120, limitsJson: { generations: 1, exports: 2, jdCustomizations: 0 }, isActive: true },
    });
    const order = await createOrder(user.id, plan.id);

    const body = { orderId: order.id, tradeNo: "W-1", amountCny: 120, sign: sign(order.id, "W-1", 120) };
    const req = new Request("http://localhost/api/payments/wechat/notify", { method: "POST", body: JSON.stringify(body) });
    const res = await wechatNotify(req);
    expect(res.status).toBe(200);

    const updated = await db.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe("FULFILLED");
  });
});
