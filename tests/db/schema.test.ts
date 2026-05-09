import { describe, expect, it } from "vitest";
import { db } from "@/server/db";

describe("db schema", () => {
  it("can create user", async () => {
    const phone = `138${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });
    expect(user.phone).toBe(phone);
  });
});
