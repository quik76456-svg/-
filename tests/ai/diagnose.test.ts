import { describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { diagnoseResume } from "@/server/ai/diagnose";

vi.mock("@/server/providers/ai/llm", () => {
  return {
    chatComplete: vi.fn().mockResolvedValue(
      JSON.stringify({
        score: 88,
        issues: [{ title: "t1", detail: "d1", priority: "HIGH" }],
      }),
    ),
  };
});

describe("diagnose", () => {
  it("creates diagnosis record from parsed text", async () => {
    const phone = `133${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        identityType: "GRAD",
        sourceFileKey: "uploads/test/1.txt",
        parseStatus: "DONE",
        parsedText: "hello",
      },
    });

    const diagnosis = await diagnoseResume(resume.id);
    expect(diagnosis.score).toBe(88);

    const fromDb = await db.diagnosis.findUnique({ where: { resumeId: resume.id } });
    expect(fromDb?.score).toBe(88);
  });
});

