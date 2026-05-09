import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";

describe("export api", () => {
  it("creates export and allows download", async () => {
    const { POST: createExport } = await import("@/app/api/exports/create/route");
    const { GET: downloadExport } = await import("@/app/api/exports/download/[token]/route");

    const user = await db.user.create({ data: { phone: `125${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const token = await createSession(user.id);

    const plan = await db.plan.create({
      data: { name: `P-${Date.now()}`, amountCny: 100, limitsJson: { generations: 1, exports: 1, jdCustomizations: 0 }, isActive: true },
    });
    const ent = await db.entitlement.create({
      data: { userId: user.id, planId: plan.id, remainingGenerations: 0, remainingExports: 1, remainingJdCustomizations: 0 },
    });

    const resume = await db.resume.create({
      data: { userId: user.id, identityType: "GRAD", sourceFileKey: "uploads/test/1.txt", parseStatus: "DONE", parsedText: "hello" },
    });
    const version = await db.resumeVersion.create({
      data: { resumeId: resume.id, versionJson: {}, templateFieldsJson: { name: "n1" } },
    });

    const createReq = new Request("http://localhost/api/exports/create", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ versionId: version.id }),
    });
    const createRes = await createExport(createReq);
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as { downloadUrl: string; token: string };
    expect(createJson.downloadUrl).toContain(createJson.token);

    const entAfter = await db.entitlement.findUnique({ where: { id: ent.id } });
    expect(entAfter?.remainingExports).toBe(0);

    const downloadReq = new Request(`http://localhost/api/exports/download/${createJson.token}`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    const downloadRes = await downloadExport(downloadReq, { params: Promise.resolve({ token: createJson.token }) });
    expect(downloadRes.status).toBe(200);
    const buf = Buffer.from(await downloadRes.arrayBuffer());
    expect(buf.length).toBeGreaterThan(0);
  });
});

