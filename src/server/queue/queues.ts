import { Queue } from "bullmq";
import { env } from "@/server/env";

const url = new URL(env.REDIS_URL);
const connection = {
  host: url.hostname,
  port: url.port ? Number(url.port) : 6379,
  username: url.username || undefined,
  password: url.password || undefined,
};

export const resumeParseQueue = new Queue("resume-parse", { connection });
export const resumeAiQueue = new Queue("resume-ai", { connection });
export const resumeExportQueue = new Queue("resume-export", { connection });
