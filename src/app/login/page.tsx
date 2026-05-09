"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [error, setError] = useState("");

  const canSend = useMemo(() => /^1\d{10}$/.test(phone) && status !== "sending", [phone, status]);
  const canVerify = useMemo(() => /^1\d{10}$/.test(phone) && /^\d{6}$/.test(code) && status !== "verifying", [phone, code, status]);

  async function sendCode() {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error(`send_failed:${res.status}`);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "send_failed");
    }
  }

  async function verify() {
    setStatus("verifying");
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) throw new Error(`verify_failed:${res.status}`);
      const json = (await res.json()) as { token: string };
      localStorage.setItem("token", json.token);
      router.push("/upload");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "verify_failed");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">手机号登录</h1>
        <div className="space-y-2">
          <label className="block text-sm text-zinc-600">手机号</label>
          <input
            className="w-full rounded-md border border-zinc-200 p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value.trim())}
            placeholder="11 位手机号"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-zinc-600">验证码</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-zinc-200 p-2"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="6 位验证码"
              inputMode="numeric"
            />
            <button className="rounded-md border border-zinc-200 px-3" disabled={!canSend} onClick={sendCode}>
              发送
            </button>
          </div>
        </div>
        <button className="w-full rounded-md bg-black py-3 text-white" disabled={!canVerify} onClick={verify}>
          登录
        </button>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
    </main>
  );
}

