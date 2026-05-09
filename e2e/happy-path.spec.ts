import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.setTimeout(60000);

test("happy path", async ({ page }) => {
  const phone = `155${`${Date.now()}`.slice(-8)}`;
  await page.request.post("/api/auth/send-code", { data: { phone } });
  const verify = await page.request.post("/api/auth/verify", { data: { phone, code: "000000" } });
  const token = (await verify.json()) as { token: string };

  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("token", t), token.token);
  await page.goto("/upload");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("token") ?? "")).toBe(token.token);

  await page.request.post("/api/debug/grant", { headers: { authorization: `Bearer ${token.token}` } });

  const buf = await fs.readFile("e2e/fixtures/resume.txt");
  const create = await page.request.post("/api/resumes/create", {
    headers: { authorization: `Bearer ${token.token}` },
    data: {
      identityType: "GRAD",
      filename: "resume.txt",
      contentType: "text/plain",
      base64: buf.toString("base64"),
    },
  });
  const created = (await create.json()) as { resumeId: string };
  expect(created.resumeId).toBeTruthy();

  await page.goto(`/diagnosis/${created.resumeId}`);
  await page.evaluate((t) => localStorage.setItem("token", t), token.token);
  await expect(page.getByText("解析状态：DONE")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("评分：")).toBeVisible({ timeout: 30000 });

  await page.getByRole("link", { name: "继续优化" }).click();
  await page.waitForURL("**/optimize/**");
  await expect(page.getByText("assistant")).toBeVisible({ timeout: 30000 });

  const msgRe = /\/api\/optimize\/[^/]+\/message/;

  await page.getByRole("textbox").fill("A1");
  await Promise.all([
    page.waitForResponse((r) => msgRe.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "发送" }).click(),
  ]);
  await page.getByRole("textbox").fill("A2");
  await Promise.all([
    page.waitForResponse((r) => msgRe.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "发送" }).click(),
  ]);
  await page.getByRole("textbox").fill("A3");
  await Promise.all([
    page.waitForResponse((r) => msgRe.test(r.url()) && r.request().method() === "POST"),
    page.getByRole("button", { name: "发送" }).click(),
  ]);

  await expect(page.getByRole("link", { name: "查看预览" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("link", { name: "查看预览" }).click();
  await page.waitForURL("**/preview/**");
  await expect(page.locator("pre")).toContainText("answers");
});
