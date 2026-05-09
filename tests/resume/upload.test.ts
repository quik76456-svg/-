import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createResumeUpload } from "@/server/resume/upload";
import { resumeParseQueue } from "@/server/queue/queues";

describe("resume upload", () => {
  beforeAll(async () => {
    await resumeParseQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    await resumeParseQueue.close();
    await db.$disconnect();
  });

  it("creates resume and enqueues parse job", async () => {
    const phone = `136${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });

    const { resumeId } = await createResumeUpload({
      userId: user.id,
      identityType: "GRAD",
      filename: "resume.txt",
      contentType: "text/plain",
      buffer: Buffer.from("hello"),
    });

    const resume = await db.resume.findUnique({ where: { id: resumeId } });
    expect(resume?.userId).toBe(user.id);
    expect(resume?.parseStatus).toBe("PENDING");

    const waiting = await resumeParseQueue.getJobs(["waiting"]);
    expect(waiting.some((j) => j.data.resumeId === resumeId)).toBe(true);
  });
});

