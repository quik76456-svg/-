"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [identityType, setIdentityType] = useState<"GRAD" | "EXP_1_5">("GRAD");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  async function upload() {
    if (!file) return;
    setStatus("uploading");
    setError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || "");
          const idx = res.indexOf(",");
          resolve(idx >= 0 ? res.slice(idx + 1) : res);
        };
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/resumes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ identityType, filename: file.name, contentType: file.type || "application/octet-stream", base64 }),
      });
      if (!res.ok) throw new Error(`upload_failed:${res.status}`);
      const json = (await res.json()) as { resumeId: string };
      router.push(`/diagnosis/${json.resumeId}`);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">上传简历</h1>
        <div className="space-y-2">
          <label className="block text-sm text-zinc-600">身份</label>
          <select
            className="w-full rounded-md border border-zinc-200 p-2"
            value={identityType}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "GRAD" || v === "EXP_1_5") setIdentityType(v);
            }}
          >
            <option value="GRAD">应届生</option>
            <option value="EXP_1_5">互联网 1-5 年</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-zinc-600">文件</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button className="w-full rounded-md bg-black py-3 text-white disabled:opacity-50" disabled={!file || status === "uploading"} onClick={upload}>
          上传并诊断
        </button>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
    </main>
  );
}
