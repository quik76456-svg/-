import { describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";

vi.mock("@/server/providers/ai/llm", () => {
  return {
    chatComplete: vi.fn().mockResolvedValue(
      JSON.stringify({
        templateFields: { name: "n1" },
      }),
    ),
  };
});

describe("resume versions api", () => {
  it("creates version idempotently and decrements entitlement once", async () => {
    const { POST: createVersion, GET: listVersions } = await import("@/app/api/resumes/[id]/versions/route");

    const user = await db.user.create({ data: { phone: `126${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const token = await createSession(user.id);

    const plan = await db.plan.create({
      data: { name: `P-${Date.now()}`, amountCny: 100, limitsJson: { generations: 2, exports: 1, jdCustomizations: 0 }, isActive: true },
    });
    const ent = await db.entitlement.create({
      data: { userId: user.id, planId: plan.id, remainingGenerations: 1, remainingExports: 0, remainingJdCustomizations: 0 },
    });

    const resume = await db.resume.create({
      data: { userId: user.id, identityType: "GRAD", sourceFileKey: "uploads/test/1.txt", parseStatus: "DONE", parsedText: "hello" },
    });
    const session = await db.qaSession.create({ data: { resumeId: resume.id, status: "ACTIVE" } });
    await db.qaMessage.create({ data: { sessionId: session.id, role: "user", content: "A1" } });

    const ctx = { params: Promise.resolve({ id: resume.id }) };
    const req1 = new Request(`http://localhost/api/resumes/${resume.id}/versions`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const res1 = await createVersion(req1, ctx);
    expect(res1.status).toBe(200);
    const json1 = (await res1.json()) as { versionId: string };
    expect(json1.versionId).toBeTruthy();

    const entAfter1 = await db.entitlement.findUnique({ where: { id: ent.id } });
    expect(entAfter1?.remainingGenerations).toBe(0);

    const req2 = new Request(`http://localhost/api/resumes/${resume.id}/versions`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const res2 = await createVersion(req2, ctx);
    expect(res2.status).toBe(200);
    const json2 = (await res2.json()) as { versionId: string };
    expect(json2.versionId).toBe(json1.versionId);

    const entAfter2 = await db.entitlement.findUnique({ where: { id: ent.id } });
    expect(entAfter2?.remainingGenerations).toBe(0);

    const listReq = new Request(`http://localhost/api/resumes/${resume.id}/versions`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    const listRes = await listVersions(listReq, ctx);
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as { versions: Array<{ id: string }> };
    expect(listJson.versions.some((v) => v.id === json1.versionId)).toBe(true);
  });
});

