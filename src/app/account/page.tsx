"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function del() {
    setStatus("deleting");
    setError("");
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch("/api/account/delete", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`delete_failed:${res.status}`);
      localStorage.removeItem("token");
      setStatus("done");
      router.push("/");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "delete_failed");
    }
  }

  return (
    <main className="mx-auto w-full max-w-md p-8 space-y-4">
      <h1 className="text-2xl font-semibold">账户</h1>
      <button className="rounded-md border border-zinc-200 px-4 py-2" disabled={status === "deleting"} onClick={del}>
        删除账户与数据
      </button>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </main>
  );
}

