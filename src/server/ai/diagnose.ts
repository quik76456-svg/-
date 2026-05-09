import { db } from "@/server/db";
import { chatComplete } from "@/server/providers/ai/llm";
import { env } from "@/server/env";

export async function diagnoseResume(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || !resume.parsedText) throw new Error("resume_not_ready");

  const system = [
    "你是资深互联网简历教练。",
    "要求：不得编造用户不存在的经历或指标；不确定必须提示用户补充。",
    "输出严格 JSON：{score:int(0-100), issues:[{title:string, detail:string, priority:'HIGH'|'MED'|'LOW'}]}",
    "issues 至少 8 条；detail 给出可执行建议但避免直接给出可复制完整成稿。",
  ].join("\n");

  const user = [
    `身份：${resume.identityType === "GRAD" ? "应届生" : "互联网1-5年"}`,
    "简历文本如下：",
    resume.parsedText.slice(0, 12000),
  ].join("\n");

  const raw = await chatComplete(env.LLM_MODEL_DIAG ?? "", [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = JSON.parse(raw) as { score: number; issues: unknown };
  const score = Math.max(0, Math.min(100, Math.floor(parsed.score)));

  return db.diagnosis.upsert({
    where: { resumeId },
    update: { score, issuesJson: parsed.issues },
    create: { resumeId, score, issuesJson: parsed.issues },
  });
}

