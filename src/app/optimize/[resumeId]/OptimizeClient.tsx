"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "assistant" | "user"; content: string };

export function OptimizeClient(props: { resumeId: string }) {
  const resumeId = props.resumeId;
  const started = useRef(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [versionId, setVersionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function start() {
      try {
        const res = await fetch("/api/optimize/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          },
          body: JSON.stringify({ resumeId }),
        });
        if (!res.ok) throw new Error(`start_failed:${res.status}`);
        const json = (await res.json()) as { sessionId: string; question: string };
        setSessionId(json.sessionId);
        setMessages([{ role: "assistant", content: json.question }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "start_failed");
      }
    }
    void start();
  }, [resumeId]);

  async function send() {
    if (!sessionId || !input.trim()) return;
    const content = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    try {
      const res = await fetch(`/api/optimize/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(`message_failed:${res.status}`);
      const json = (await res.json()) as { done: boolean; nextQuestion?: string; versionId?: string };
      if (json.done) {
        setVersionId(json.versionId ?? null);
      } else if (json.nextQuestion) {
        setMessages((m) => [...m, { role: "assistant", content: json.nextQuestion! }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "message_failed");
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">问答优化</h1>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="space-y-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`rounded-md border border-zinc-200 p-3 ${m.role === "assistant" ? "bg-zinc-50" : ""}`}
          >
            <div className="text-xs text-zinc-500">{m.role}</div>
            <div className="mt-1">{m.content}</div>
          </div>
        ))}
      </div>
      {versionId ? (
        <div className="flex gap-3">
          <Link className="rounded-md bg-black px-4 py-2 text-white" href={`/preview/${versionId}`}>
            查看预览
          </Link>
        </div>
      ) : (
        <div className="flex gap-2">
          <input className="flex-1 rounded-md border border-zinc-200 p-2" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="rounded-md bg-black px-4 text-white" onClick={send}>
            发送
          </button>
        </div>
      )}
    </main>
  );
}
