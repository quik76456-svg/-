import { env } from "@/server/env";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ChatCompletionResponse = { choices?: Array<{ message?: { content?: string } }> };

export async function chatComplete(model: string, messages: ChatMessage[]) {
  if (!env.LLM_BASE_URL || !env.LLM_API_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("llm_not_configured");
    void model;
    void messages;
    return JSON.stringify({
      score: 80,
      issues: [{ title: "t1", detail: "d1", priority: "MED" }],
      templateFields: { name: "dev" },
    });
  }

  const base = env.LLM_BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`llm_error:${res.status}`);
  const json = (await res.json()) as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content ?? "";
  return content as string;
}
