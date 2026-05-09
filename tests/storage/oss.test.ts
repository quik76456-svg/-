import { describe, expect, it } from "vitest";
import { getObject, putObject } from "@/server/providers/storage/oss";

describe("storage", () => {
  it("puts and gets object", async () => {
    const key = `uploads/test/${Date.now()}.txt`;
    const content = Buffer.from("hello");

    await putObject(key, content, "text/plain");
    const got = await getObject(key);

    expect(got.toString("utf-8")).toBe("hello");
  });
});
