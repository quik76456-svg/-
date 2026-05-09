import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">AI 简历优化与导出</h1>
        <p className="mt-2 text-zinc-600">登录后上传简历，获取诊断，付费后生成版本并导出 Word。</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Link className="rounded-md bg-black text-white py-3 text-center" href="/login">
          登录
        </Link>
        <Link className="rounded-md border border-zinc-200 py-3 text-center" href="/upload">
          上传简历
        </Link>
      </div>
    </main>
  );
}
