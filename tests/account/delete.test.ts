import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";

describe("account delete", () => {
  it("deletes user and related data", async () => {
    const { POST: deleteAccount } = await import("@/app/api/account/delete/route");

    const user = await db.user.create({ data: { phone: `124${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const token = await createSession(user.id);

    const resume = await db.resume.create({
      data: { userId: user.id, identityType: "GRAD", sourceFileKey: "uploads/test/1.txt", parseStatus: "DONE", parsedText: "hello" },
    });
    await db.qaSession.create({ data: { resumeId: resume.id, status: "ACTIVE" } });

    const req = new Request("http://localhost/api/account/delete", { method: "POST", headers: { authorization: `Bearer ${token}` } });
    const res = await deleteAccount(req);
    expect(res.status).toBe(200);

    const u = await db.user.findUnique({ where: { id: user.id } });
    expect(u).toBeNull();
  });
});

