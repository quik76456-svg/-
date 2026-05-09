import { NextResponse } from "next/server";
import { verifySession } from "@/server/auth/session";
import { downloadExport } from "@/server/resume/export";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(jwt);

  try {
    const { buf } = await downloadExport(userId, token);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="resume.docx"`,
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "expired") return NextResponse.json({ error: "expired" }, { status: 410 });
    if (code === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}

