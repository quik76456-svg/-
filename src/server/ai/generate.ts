import { db } from "@/server/db";
import { chatComplete } from "@/server/providers/ai/llm";
import { env } from "@/server/env";

export async function generateResumeVersion(resumeId: string, sessionId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || !resume.parsedText) throw new Error("resume_not_ready");

  const messages = await db.qaMessage.findMany({ where: { sessionId, role: "user" }, orderBy: { createdAt: "asc" } });
  const qa = messages.map((m) => m.content).join("\n");

  const system = [
    "你是资深互联网简历教练与写作助手。",
    "要求：不得编造用户不存在的经历或指标；不确定必须提示 needs_confirmation=true。",
    "输出严格 JSON：{templateFields:object}",
  ].join("\n");

  const user = [
    `身份：${resume.identityType === "GRAD" ? "应届生" : "互联网1-5年"}`,
    "简历原文如下：",
    resume.parsedText.slice(0, 12000),
    "追问问答如下：",
    qa.slice(0, 8000),
  ].join("\n");

  const raw = await chatComplete(env.LLM_MODEL_FINAL ?? "", [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  const parsed = JSON.parse(raw) as { templateFields?: unknown };

  return {
    versionJson: { source: "llm", sessionId },
    templateFieldsJson: parsed.templateFields ?? {},
  };
}

