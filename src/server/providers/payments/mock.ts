import { createHmac } from "node:crypto";
import { env } from "@/server/env";

function sign(orderId: string, tradeNo: string, amountCny: number) {
  return createHmac("sha256", env.AUTH_JWT_SECRET).update(`${orderId}.${tradeNo}.${amountCny}`).digest("hex");
}

export async function verifyMockNotify(req: Request) {
  const json = (await req.json()) as unknown;
  const body = json as { orderId?: unknown; tradeNo?: unknown; amountCny?: unknown; sign?: unknown };

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const tradeNo = typeof body.tradeNo === "string" ? body.tradeNo : "";
  const amountCny = typeof body.amountCny === "number" ? body.amountCny : Number(body.amountCny);
  const provided = typeof body.sign === "string" ? body.sign : "";

  if (!orderId || !tradeNo || !Number.isFinite(amountCny) || !provided) throw new Error("bad_request");
  const expected = sign(orderId, tradeNo, amountCny);
  if (expected !== provided) throw new Error("bad_signature");

  return { orderId, providerTradeNo: tradeNo, amountCny };
}

