import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/auth/session";
import { createOrder } from "@/server/billing/orders";

const bodySchema = z.object({ planId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { planId } = bodySchema.parse(json);

  const order = await createOrder(userId, planId);
  return NextResponse.json({ order });
}

