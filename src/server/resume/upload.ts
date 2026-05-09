import { db } from "@/server/db";
import { putObject } from "@/server/providers/storage/oss";
import { resumeParseQueue } from "@/server/queue/queues";

export type CreateResumeUploadArgs = {
  userId: string;
  identityType: "GRAD" | "EXP_1_5";
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export async function createResumeUpload(args: CreateResumeUploadArgs) {
  const key = `uploads/${args.userId}/${Date.now()}-${encodeURIComponent(args.filename)}`;
  await putObject(key, args.buffer, args.contentType);

  const resume = await db.resume.create({
    data: { userId: args.userId, identityType: args.identityType, sourceFileKey: key, parseStatus: "PENDING" },
  });

  await resumeParseQueue.add("parse", { resumeId: resume.id });

  return { resumeId: resume.id, key };
}
