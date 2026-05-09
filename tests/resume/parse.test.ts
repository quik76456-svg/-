import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { putObject } from "@/server/providers/storage/oss";
import { parseResumeText, runParseJob } from "@/server/resume/parse";

describe("resume parse", () => {
  it("parses txt into text", async () => {
    const key = `uploads/test/${Date.now()}.txt`;
    await putObject(key, Buffer.from("hello"), "text/plain");
    const text = await parseResumeText(key);
    expect(text).toBe("hello");
  });

  it("runParseJob sets DONE for supported file type", async () => {
    const phone = `135${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });

    const key = `uploads/test/${Date.now()}.txt`;
    await putObject(key, Buffer.from("hello"), "text/plain");

    const resume = await db.resume.create({
      data: { userId: user.id, identityType: "GRAD", sourceFileKey: key, parseStatus: "PENDING" },
    });

    await runParseJob(resume.id);

    const updated = await db.resume.findUnique({ where: { id: resume.id } });
    expect(updated?.parseStatus).toBe("DONE");
    expect(updated?.parsedText).toBe("hello");
  });

  it("runParseJob sets FAILED for unsupported file type", async () => {
    const phone = `134${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });

    const key = `uploads/test/${Date.now()}.bin`;
    await putObject(key, Buffer.from("hello"), "application/octet-stream");

    const resume = await db.resume.create({
      data: { userId: user.id, identityType: "GRAD", sourceFileKey: key, parseStatus: "PENDING" },
    });

    await expect(runParseJob(resume.id)).rejects.toThrow();

    const updated = await db.resume.findUnique({ where: { id: resume.id } });
    expect(updated?.parseStatus).toBe("FAILED");
  });
});

