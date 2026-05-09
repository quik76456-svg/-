import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/auth/session";
import { createExport } from "@/server/resume/export";

const bodySchema = z.object({ versionId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { versionId } = bodySchema.parse(json);

  try {
    const { downloadToken } = await createExport(userId, versionId);
    return NextResponse.json({ downloadUrl: `/api/exports/download/${downloadToken}`, token: downloadToken });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "no_entitlement") return NextResponse.json({ error: "no_entitlement" }, { status: 403 });
    if (code === "not_found" || code === "version_not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}

