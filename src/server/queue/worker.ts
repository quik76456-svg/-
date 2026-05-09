import { Worker } from "bullmq";
import { env } from "@/server/env";
import { runParseJob } from "@/server/resume/parse";

const url = new URL(env.REDIS_URL);
const connection = {
  host: url.hostname,
  port: url.port ? Number(url.port) : 6379,
  username: url.username || undefined,
  password: url.password || undefined,
};

export function startWorkers() {
  new Worker(
    "resume-parse",
    async (job) => {
      if (job.name === "parse") await runParseJob(job.data.resumeId);
    },
    { connection },
  );
}
