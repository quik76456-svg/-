import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import OSS from "ali-oss";
import { env } from "@/server/env";

const useOss =
  Boolean(env.OSS_ACCESS_KEY_ID) &&
  Boolean(env.OSS_ACCESS_KEY_SECRET) &&
  Boolean(env.OSS_BUCKET) &&
  Boolean(env.OSS_REGION);

export const oss = useOss
  ? new OSS({
      accessKeyId: env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: env.OSS_ACCESS_KEY_SECRET!,
      bucket: env.OSS_BUCKET!,
      region: env.OSS_REGION!,
      endpoint: env.OSS_ENDPOINT || undefined,
    })
  : null;

const localRoot = path.resolve(process.cwd(), ".local-oss");

function localObjectPath(key: string) {
  const resolved = path.resolve(localRoot, key);
  if (resolved === localRoot) throw new Error("invalid_key");
  if (!resolved.startsWith(`${localRoot}${path.sep}`)) throw new Error("invalid_key");
  return resolved;
}

export async function putObject(key: string, content: Buffer, contentType?: string) {
  if (useOss) {
    return oss!.put(key, content, { headers: contentType ? { "Content-Type": contentType } : undefined });
  }

  const filePath = localObjectPath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

export async function getObject(key: string) {
  if (useOss) {
    const res = await oss!.get(key);
    const content = res.content as unknown;
    if (Buffer.isBuffer(content)) return content;
    if (typeof content === "string") return Buffer.from(content);
    if (content instanceof Uint8Array) return Buffer.from(content);
    if (content instanceof ArrayBuffer) return Buffer.from(new Uint8Array(content));
    if (content instanceof Readable) {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        content.on("data", (d: unknown) => {
          if (Buffer.isBuffer(d)) chunks.push(d);
          else if (typeof d === "string") chunks.push(Buffer.from(d));
          else if (d instanceof Uint8Array) chunks.push(Buffer.from(d));
        });
        content.on("end", () => resolve());
        content.on("error", (e) => reject(e));
      });
      return Buffer.concat(chunks);
    }
    throw new Error("unsupported_oss_content");
  }

  const filePath = localObjectPath(key);
  return fs.readFile(filePath);
}
