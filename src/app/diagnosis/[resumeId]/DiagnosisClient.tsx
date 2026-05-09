"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Issue = { title: string; detail: string; priority?: string };
type Diagnosis = { score: number; issuesJson: Issue[] };

export function DiagnosisClient(props: { resumeId: string }) {
  const resumeId = props.resumeId;
  const [parseStatus, setParseStatus] = useState<string>("PENDING");
  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const token = localStorage.getItem("token") ?? "";
        const res = await fetch(`/api/resumes/${resumeId}/status`, { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`status_failed:${res.status}`);
        const json = (await res.json()) as { parseStatus: string };
        setParseStatus(json.parseStatus);
        if (json.parseStatus === "DONE") {
          const d = await fetch(`/api/resumes/${resumeId}/diagnosis`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
          if (d.ok) {
            const dj = (await d.json()) as { diagnosis: Diagnosis };
            setDiag(dj.diagnosis);
          }
        } else {
          timer = setTimeout(poll, 1500);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "poll_failed");
        timer = setTimeout(poll, 1500);
      }
    }

    void poll();
    return () => clearTimeout(timer);
  }, [resumeId]);

  return (
    <main className="mx-auto w-full max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-semibold">诊断</h1>
      <div className="text-sm text-zinc-600">解析状态：{parseStatus}</div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {diag ? (
        <div className="space-y-3">
          <div className="text-lg font-medium">评分：{diag.score}</div>
          <div className="space-y-2">
            {diag.issuesJson.slice(0, 10).map((it, idx) => (
              <div key={idx} className="rounded-md border border-zinc-200 p-3">
                <div className="font-medium">{it.title}</div>
                <div className="text-sm text-zinc-600 mt-1">{it.detail}</div>
              </div>
            ))}
          </div>
          <Link className="inline-block rounded-md bg-black px-4 py-2 text-white" href={`/optimize/${resumeId}`}>
            继续优化
          </Link>
        </div>
      ) : null}
    </main>
  );
}

