import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/auth/session";
import { createResumeUpload } from "@/server/resume/upload";

const bodySchema = z.object({
  identityType: z.enum(["GRAD", "EXP_1_5"]),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  base64: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { identityType, filename, contentType, base64 } = bodySchema.parse(json);
  const buffer = Buffer.from(base64, "base64");

  const { resumeId } = await createResumeUpload({ userId, identityType, filename, contentType, buffer });
  return NextResponse.json({ resumeId });
}
