import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";

describe("optimize flow", () => {
  it("starts session and asks scripted questions, then creates version", async () => {
    const { POST: startOptimize } = await import("@/app/api/optimize/start/route");
    const { POST: messageOptimize } = await import("@/app/api/optimize/[sessionId]/message/route");

    const phone = `127${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });
    const token = await createSession(user.id);

    const plan = await db.plan.create({
      data: { name: `P-${Date.now()}`, amountCny: 100, limitsJson: { generations: 1, exports: 1, jdCustomizations: 0 }, isActive: true },
    });
    await db.entitlement.create({
      data: { userId: user.id, planId: plan.id, remainingGenerations: 1, remainingExports: 0, remainingJdCustomizations: 0 },
    });

    const resume = await db.resume.create({
      data: { userId: user.id, identityType: "GRAD", sourceFileKey: "uploads/test/1.txt", parseStatus: "DONE", parsedText: "hello" },
    });

    const startReq = new Request("http://localhost/api/optimize/start", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ resumeId: resume.id }),
    });
    const startRes = await startOptimize(startReq);
    expect(startRes.status).toBe(200);
    const startJson = (await startRes.json()) as { sessionId: string; question: string };
    expect(startJson.sessionId).toBeTruthy();
    expect(startJson.question).toContain("投递");

    const ask1Req = new Request(`http://localhost/api/optimize/${startJson.sessionId}/message`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: "A1" }),
    });
    const ctx = { params: Promise.resolve({ sessionId: startJson.sessionId }) };
    const ask1Res = await messageOptimize(ask1Req, ctx);
    const ask1Json = (await ask1Res.json()) as { done: boolean; nextQuestion?: string };
    expect(ask1Json.done).toBe(false);
    expect(ask1Json.nextQuestion).toContain("最能打");

    const ask2Req = new Request(`http://localhost/api/optimize/${startJson.sessionId}/message`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: "A2" }),
    });
    const ask2Res = await messageOptimize(ask2Req, ctx);
    const ask2Json = (await ask2Res.json()) as { done: boolean; nextQuestion?: string };
    expect(ask2Json.done).toBe(false);
    expect(ask2Json.nextQuestion).toContain("量化指标");

    const ask3Req = new Request(`http://localhost/api/optimize/${startJson.sessionId}/message`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: "A3" }),
    });
    const ask3Res = await messageOptimize(ask3Req, ctx);
    const ask3Json = (await ask3Res.json()) as { done: boolean; versionId?: string };
    expect(ask3Json.done).toBe(true);
    expect(ask3Json.versionId).toBeTruthy();

    const version = await db.resumeVersion.findUnique({ where: { id: ask3Json.versionId! } });
    expect(version?.resumeId).toBe(resume.id);
  });
});
