import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createSession, verifySession } from "@/server/auth/session";

describe("auth session", () => {
  it("issues and verifies session", async () => {
    const phone = `139${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });
    const token = await createSession(user.id);
    const res = await verifySession(token);
    expect(res.userId).toBe(user.id);
  });
});
