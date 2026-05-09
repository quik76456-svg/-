import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { grantPlanEntitlement } from "@/server/billing/entitlements";

describe("entitlements", () => {
  it("grants plan limits to user", async () => {
    const user = await db.user.create({ data: { phone: `137${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({
      data: { name: `P-${Date.now()}`, amountCny: 100, limitsJson: { generations: 1, exports: 3, jdCustomizations: 1 } },
    });
    const e = await grantPlanEntitlement(user.id, plan.id);
    expect(e.remainingExports).toBe(3);
  });
});

