import { NextResponse } from "next/server";
import { verifySession } from "@/server/auth/session";
import { db } from "@/server/db";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const plan = await db.plan.create({
    data: { name: `DEV-${Date.now()}`, amountCny: 0, limitsJson: { generations: 10, exports: 10, jdCustomizations: 0 }, isActive: true },
  });
  const e = await db.entitlement.create({
    data: { userId, planId: plan.id, remainingGenerations: 10, remainingExports: 10, remainingJdCustomizations: 0 },
  });

  return NextResponse.json({ entitlementId: e.id });
}

