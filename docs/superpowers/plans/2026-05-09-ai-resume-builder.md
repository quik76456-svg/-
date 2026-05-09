# AI 简历优化与导出平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个支持手机号注册登录、上传简历、AI 诊断与追问优化、付费后导出 Word 的可商用 Web 网站（国内支付宝+微信、阿里云短信）。

**Architecture:** 以单体 Web 应用（Next.js）承载前端与 API，核心业务通过数据库（PostgreSQL）与队列（Redis）解耦长耗时任务（解析/生成/导出）。支付、短信、对象存储、AI 模型通过 provider 适配层隔离，便于替换与扩展。

**Tech Stack:** Next.js（App Router, TypeScript）/ PostgreSQL / Prisma / Redis + BullMQ / 阿里云短信 / 阿里云 OSS / 微信支付 V3 / 支付宝（手机网站支付）/ OpenAI-Compatible LLM API / Vitest（单测）+ Playwright（E2E）

---

## 0. 目录与模块划分（先定结构，避免越写越乱）

### 0.1 目录结构（目标形态）
- `app/`：Next.js 页面（Landing/Auth/Upload/Diagnosis/Optimize/Preview/Account）
- `app/api/**`：API routes（鉴权、上传、支付、导出等）
- `src/server/`：服务端领域逻辑（可被 API routes 调用）
  - `src/server/auth/`：短信登录、会话
  - `src/server/billing/`：套餐、订单、权益
  - `src/server/resume/`：简历、解析、版本、导出
  - `src/server/ai/`：诊断与问答编排
  - `src/server/providers/`：短信/支付/存储/AI provider 适配
  - `src/server/queue/`：BullMQ 队列与 worker
  - `src/server/security/`：限流、风控、内容安全
- `prisma/schema.prisma`
- `templates/`：docx 模板文件（MVP：`templates/default.docx`）
- `tests/`：单测
- `e2e/`：Playwright 用例
- `docker-compose.yml`：本地 Postgres + Redis
- `.env.example`：环境变量样例（不含密钥）

### 0.2 环境变量（MVP 必需）
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://...`
- `APP_URL=https://...`（生成回调/跳转 URL）
- `AUTH_JWT_SECRET=...`
- `OSS_ACCESS_KEY_ID=...`
- `OSS_ACCESS_KEY_SECRET=...`
- `OSS_BUCKET=...`
- `OSS_REGION=...`
- `OSS_ENDPOINT=...`（如需）
- `SMS_ALIYUN_ACCESS_KEY_ID=...`
- `SMS_ALIYUN_ACCESS_KEY_SECRET=...`
- `SMS_ALIYUN_SIGN_NAME=...`
- `SMS_ALIYUN_TEMPLATE_CODE_LOGIN=...`
- `ALIPAY_APP_ID=...`
- `ALIPAY_PRIVATE_KEY=...`
- `ALIPAY_ALIPAY_PUBLIC_KEY=...`
- `WECHAT_MCH_ID=...`
- `WECHAT_SERIAL_NO=...`
- `WECHAT_PRIVATE_KEY=...`
- `WECHAT_API_V3_KEY=...`
- `LLM_BASE_URL=...`（OpenAI-compatible）
- `LLM_API_KEY=...`
- `LLM_MODEL_DIAG=...`
- `LLM_MODEL_FINAL=...`

---

## Task 1: 项目脚手架与基础依赖

**Files:**
- Create: `package.json`（由脚手架生成）
- Create: `tsconfig.json`（由脚手架生成）
- Create: `next.config.*`（由脚手架生成）
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `src/server/env.ts`

- [ ] **Step 1: 初始化 Next.js + TypeScript**

Run:

```bash
pnpm create next-app@latest . --ts --eslint
```

Expected: 生成可启动的 Next.js 项目。

- [ ] **Step 2: 添加后端依赖（DB/Queue/Providers/Tests）**

Run:

```bash
pnpm add @prisma/client prisma zod jose bullmq ioredis
pnpm add alipay-sdk wechatpay-node-v3 ali-oss
pnpm add -D vitest @vitest/coverage-v8 playwright
```

- [ ] **Step 3: 添加本地依赖服务（Postgres + Redis）**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
volumes:
  postgres_data:
```

- [ ] **Step 4: 增加环境变量加载与校验**

Create `src/server/env.ts`:

```ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  APP_URL: z.string().url(),
  AUTH_JWT_SECRET: z.string().min(32),

  OSS_ACCESS_KEY_ID: z.string().min(1),
  OSS_ACCESS_KEY_SECRET: z.string().min(1),
  OSS_BUCKET: z.string().min(1),
  OSS_REGION: z.string().min(1),
  OSS_ENDPOINT: z.string().optional(),

  SMS_ALIYUN_ACCESS_KEY_ID: z.string().min(1),
  SMS_ALIYUN_ACCESS_KEY_SECRET: z.string().min(1),
  SMS_ALIYUN_SIGN_NAME: z.string().min(1),
  SMS_ALIYUN_TEMPLATE_CODE_LOGIN: z.string().min(1),

  ALIPAY_APP_ID: z.string().min(1),
  ALIPAY_PRIVATE_KEY: z.string().min(1),
  ALIPAY_ALIPAY_PUBLIC_KEY: z.string().min(1),

  WECHAT_MCH_ID: z.string().min(1),
  WECHAT_SERIAL_NO: z.string().min(1),
  WECHAT_PRIVATE_KEY: z.string().min(1),
  WECHAT_API_V3_KEY: z.string().min(1),

  LLM_BASE_URL: z.string().url(),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL_DIAG: z.string().min(1),
  LLM_MODEL_FINAL: z.string().min(1),
});

export const env = schema.parse(process.env);
```

- [ ] **Step 5: 运行基础检查**

Run:

```bash
pnpm lint
pnpm test -- --help || true
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold nextjs app with docker postgres/redis and env schema"
```

---

## Task 2: 数据库建模（Prisma）与迁移

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/server/db.ts`
- Test: `tests/db/schema.test.ts`

- [ ] **Step 1: 定义 Prisma schema（MVP 子集）**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum IdentityType {
  GRAD
  EXP_1_5
}

enum OrderStatus {
  CREATED
  PENDING_PAY
  PAID
  FULFILLED
  REFUNDED
}

enum PaymentProvider {
  ALIPAY
  WECHAT
}

model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  createdAt DateTime @default(now())

  resumes   Resume[]
  orders    Order[]
  sessions  AuthSession[]
  entitlements Entitlement[]
}

model AuthSmsCode {
  id        String   @id @default(cuid())
  phone     String
  codeHash  String
  expiresAt DateTime
  sentAt    DateTime @default(now())
  ip        String?
  scene     String

  @@index([phone, scene])
}

model AuthSession {
  id        String   @id @default(cuid())
  userId    String
  tokenJti  String   @unique
  createdAt DateTime @default(now())
  revokedAt DateTime?

  user User @relation(fields: [userId], references: [id])
  @@index([userId])
}

model Resume {
  id            String       @id @default(cuid())
  userId        String
  identityType  IdentityType
  sourceFileKey String
  parsedText    String?
  parseStatus   String       @default("PENDING")
  createdAt     DateTime     @default(now())

  user      User @relation(fields: [userId], references: [id])
  sessions  QaSession[]
  versions  ResumeVersion[]
  diagnosis Diagnosis?

  @@index([userId, createdAt])
}

model Diagnosis {
  id        String   @id @default(cuid())
  resumeId  String   @unique
  score     Int
  issuesJson Json
  createdAt DateTime @default(now())

  resume Resume @relation(fields: [resumeId], references: [id])
}

model QaSession {
  id        String   @id @default(cuid())
  resumeId  String
  status    String   @default("ACTIVE")
  startedAt DateTime @default(now())
  endedAt   DateTime?

  resume    Resume @relation(fields: [resumeId], references: [id])
  messages  QaMessage[]
  versions  ResumeVersion[]
}

model QaMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String
  content   String
  tokens    Int?
  createdAt DateTime @default(now())

  session QaSession @relation(fields: [sessionId], references: [id])
  @@index([sessionId, createdAt])
}

model Plan {
  id        String   @id @default(cuid())
  name      String
  limitsJson Json
  amountCny Int
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())

  orders Order[]
}

model Order {
  id              String          @id @default(cuid())
  userId          String
  planId          String
  amountCny       Int
  status          OrderStatus     @default(CREATED)
  provider        PaymentProvider?
  providerTradeNo String?
  createdAt       DateTime        @default(now())
  paidAt          DateTime?

  user User @relation(fields: [userId], references: [id])
  plan Plan @relation(fields: [planId], references: [id])

  @@index([userId, createdAt])
}

model Entitlement {
  id        String   @id @default(cuid())
  userId    String
  planId    String
  remainingGenerations Int
  remainingExports     Int
  remainingJdCustomizations Int
  expiresAt DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  plan Plan @relation(fields: [planId], references: [id])

  @@index([userId, planId])
}

model ResumeVersion {
  id              String   @id @default(cuid())
  resumeId        String
  sessionId       String?
  versionJson     Json
  templateFieldsJson Json
  createdAt       DateTime @default(now())

  resume  Resume @relation(fields: [resumeId], references: [id])
  session QaSession? @relation(fields: [sessionId], references: [id])
  exports Export[]

  @@index([resumeId, createdAt])
}

model Export {
  id          String   @id @default(cuid())
  versionId   String
  format      String
  templateId  String
  fileKey     String
  downloadToken String @unique
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  version ResumeVersion @relation(fields: [versionId], references: [id])
  @@index([versionId, createdAt])
}
```

- [ ] **Step 2: 创建 DB client**

Create `src/server/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
```

- [ ] **Step 3: 运行迁移**

Run:

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

- [ ] **Step 4: 写一个 schema 可用性冒烟测试**

Create `tests/db/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { db } from "@/src/server/db";

describe("db schema", () => {
  it("can create user", async () => {
    const phone = `138${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });
    expect(user.phone).toBe(phone);
  });
});
```

- [ ] **Step 5: 运行测试**

Run:

```bash
pnpm vitest run
```

- [ ] **Step 6: Commit**

```bash
git add prisma src/server/db.ts tests
git commit -m "feat: add prisma schema for auth/resume/billing/export"
```

---

## Task 3: 身份认证（手机号+短信验证码）与会话

**Files:**
- Create: `src/server/auth/sms.ts`
- Create: `src/server/auth/session.ts`
- Create: `src/server/security/rateLimit.ts`
- Create: `app/api/auth/send-code/route.ts`
- Create: `app/api/auth/verify/route.ts`
- Test: `tests/auth/session.test.ts`

- [ ] **Step 1: Redis 限流器（按 IP/手机号）**

Create `src/server/security/rateLimit.ts`:

```ts
import { Redis } from "ioredis";
import { env } from "@/src/server/env";

const redis = new Redis(env.REDIS_URL);

export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${key}:${Math.floor(now / windowSeconds)}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
```

- [ ] **Step 2: 短信 provider（阿里云）**

Create `src/server/auth/sms.ts`:

```ts
import { createHash, randomInt } from "node:crypto";
import { env } from "@/src/server/env";
import { db } from "@/src/server/db";

export function generateCode() {
  return `${randomInt(0, 1000000)}`.padStart(6, "0");
}

export function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function storeLoginCode(phone: string, code: string, ip?: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.authSmsCode.create({
    data: {
      phone,
      codeHash: hashCode(code),
      expiresAt,
      ip,
      scene: "LOGIN",
    },
  });
  return { expiresAt };
}

export async function sendLoginSms(_phone: string, _code: string) {
  void env.SMS_ALIYUN_ACCESS_KEY_ID;
  void env.SMS_ALIYUN_ACCESS_KEY_SECRET;
  void env.SMS_ALIYUN_SIGN_NAME;
  void env.SMS_ALIYUN_TEMPLATE_CODE_LOGIN;

  throw new Error("Not implemented: integrate Aliyun SMS SDK send");
}
```

- [ ] **Step 3: 会话 JWT（jose）+ 会话撤销表**

Create `src/server/auth/session.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/src/server/env";
import { db } from "@/src/server/db";
import { randomUUID } from "node:crypto";

function secret() {
  return new TextEncoder().encode(env.AUTH_JWT_SECRET);
}

export async function createSession(userId: string) {
  const jti = randomUUID();
  await db.authSession.create({ data: { userId, tokenJti: jti } });

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setJti(jti)
    .sign(secret());

  return token;
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  const userId = payload.sub;
  const jti = payload.jti;
  if (!userId || !jti) throw new Error("invalid_token");

  const row = await db.authSession.findUnique({ where: { tokenJti: jti } });
  if (!row || row.revokedAt) throw new Error("revoked");
  return { userId };
}
```

- [ ] **Step 4: API - 发送验证码**

Create `app/api/auth/send-code/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCode, sendLoginSms, storeLoginCode } from "@/src/server/auth/sms";
import { hitRateLimit } from "@/src/server/security/rateLimit";

const bodySchema = z.object({ phone: z.string().regex(/^1\d{10}$/) });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const json = await req.json();
  const { phone } = bodySchema.parse(json);

  const rl1 = await hitRateLimit(`sms:ip:${ip ?? "unknown"}`, 20, 3600);
  if (!rl1.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const rl2 = await hitRateLimit(`sms:phone:${phone}`, 5, 3600);
  if (!rl2.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const code = generateCode();
  await storeLoginCode(phone, code, ip);
  await sendLoginSms(phone, code);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: API - 校验验证码并返回 session token**

Create `app/api/auth/verify/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/src/server/db";
import { createSession } from "@/src/server/auth/session";
import { hashCode } from "@/src/server/auth/sms";

const bodySchema = z.object({ phone: z.string().regex(/^1\d{10}$/), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const json = await req.json();
  const { phone, code } = bodySchema.parse(json);

  const row = await db.authSmsCode.findFirst({
    where: { phone, scene: "LOGIN" },
    orderBy: { sentAt: "desc" },
  });
  if (!row) return NextResponse.json({ error: "code_not_found" }, { status: 400 });
  if (row.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "code_expired" }, { status: 400 });
  if (row.codeHash !== hashCode(code)) return NextResponse.json({ error: "code_invalid" }, { status: 400 });

  const user = await db.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });
  const token = await createSession(user.id);

  return NextResponse.json({ token });
}
```

- [ ] **Step 6: 会话单测**

Create `tests/auth/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { db } from "@/src/server/db";
import { createSession, verifySession } from "@/src/server/auth/session";

describe("auth session", () => {
  it("issues and verifies session", async () => {
    const phone = `139${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0");
    const user = await db.user.create({ data: { phone } });
    const token = await createSession(user.id);
    const res = await verifySession(token);
    expect(res.userId).toBe(user.id);
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add src/server/auth src/server/security app/api/auth tests/auth
git commit -m "feat: phone auth via sms and jwt sessions"
```

---

## Task 4: 套餐（Plan）种子数据与展示 API

**Files:**
- Create: `src/server/billing/plans.ts`
- Create: `app/api/plans/route.ts`
- Create: `prisma/seed.ts`

- [ ] **Step 1: 定义默认套餐（基础/高级/尊享）**

Create `src/server/billing/plans.ts`:

```ts
export const defaultPlans = [
  {
    name: "基础版",
    amountCny: 1990,
    limits: { generations: 1, exports: 1, jdCustomizations: 0, templateCount: 1, maxChatTurns: 8 },
  },
  {
    name: "高级版",
    amountCny: 5990,
    limits: { generations: 1, exports: 3, jdCustomizations: 1, templateCount: 3, maxChatTurns: 18 },
  },
  {
    name: "尊享版",
    amountCny: 19900,
    limits: { generations: 1, exports: 10, jdCustomizations: 3, templateCount: 6, maxChatTurns: 40 },
  },
] as const;
```

- [ ] **Step 2: Prisma seed 写入套餐**

Create `prisma/seed.ts`:

```ts
import { db } from "@/src/server/db";
import { defaultPlans } from "@/src/server/billing/plans";

async function main() {
  for (const p of defaultPlans) {
    await db.plan.upsert({
      where: { name: p.name },
      update: { amountCny: p.amountCny, limitsJson: p.limits, isActive: true },
      create: { name: p.name, amountCny: p.amountCny, limitsJson: p.limits, isActive: true },
    });
  }
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 3: 提供 plans API**

Create `app/api/plans/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/src/server/db";

export async function GET() {
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { amountCny: "asc" } });
  return NextResponse.json({ plans });
}
```

- [ ] **Step 4: 运行 seed**

Run:

```bash
pnpm prisma db seed
```

- [ ] **Step 5: Commit**

```bash
git add prisma src/server/billing app/api/plans
git commit -m "feat: add plans seed and list api"
```

---

## Task 5: 简历上传（OSS）与解析任务队列

**Files:**
- Create: `src/server/providers/storage/oss.ts`
- Create: `src/server/queue/queues.ts`
- Create: `src/server/queue/worker.ts`
- Create: `src/server/resume/upload.ts`
- Create: `src/server/resume/parse.ts`
- Create: `app/api/resumes/create/route.ts`
- Create: `app/api/resumes/[id]/status/route.ts`

- [ ] **Step 1: OSS provider（上传 buffer / stream）**

Create `src/server/providers/storage/oss.ts`:

```ts
import OSS from "ali-oss";
import { env } from "@/src/server/env";

export const oss = new OSS({
  accessKeyId: env.OSS_ACCESS_KEY_ID,
  accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
  bucket: env.OSS_BUCKET,
  region: env.OSS_REGION,
  endpoint: env.OSS_ENDPOINT,
});

export async function putObject(key: string, content: Buffer, contentType?: string) {
  return oss.put(key, content, { headers: contentType ? { "Content-Type": contentType } : undefined });
}
```

- [ ] **Step 2: BullMQ 队列**

Create `src/server/queue/queues.ts`:

```ts
import { Queue } from "bullmq";
import { env } from "@/src/server/env";

export const resumeParseQueue = new Queue("resume-parse", { connection: { url: env.REDIS_URL } });
export const resumeAiQueue = new Queue("resume-ai", { connection: { url: env.REDIS_URL } });
export const resumeExportQueue = new Queue("resume-export", { connection: { url: env.REDIS_URL } });
```

- [ ] **Step 3: 上传 API（创建 Resume + 写 OSS + 入队解析）**

Create `app/api/resumes/create/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { putObject } from "@/src/server/providers/storage/oss";
import { db } from "@/src/server/db";
import { resumeParseQueue } from "@/src/server/queue/queues";
import { verifySession } from "@/src/server/auth/session";

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
  const key = `uploads/${userId}/${Date.now()}-${encodeURIComponent(filename)}`;
  await putObject(key, buffer, contentType);

  const resume = await db.resume.create({
    data: { userId, identityType, sourceFileKey: key, parseStatus: "PENDING" },
  });

  await resumeParseQueue.add("parse", { resumeId: resume.id });

  return NextResponse.json({ resumeId: resume.id });
}
```

- [ ] **Step 4: 解析逻辑（先留空实现，跑通队列）**

Create `src/server/resume/parse.ts`:

```ts
import { db } from "@/src/server/db";

export async function parseResumeText(_sourceFileKey: string) {
  throw new Error("Not implemented: download from OSS and parse PDF/DOC/DOCX to text");
}

export async function runParseJob(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new Error("resume_not_found");
  await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "PARSING" } });

  const text = await parseResumeText(resume.sourceFileKey);
  await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "DONE", parsedText: text } });
}
```

- [ ] **Step 5: Worker 启动**

Create `src/server/queue/worker.ts`:

```ts
import { Worker } from "bullmq";
import { env } from "@/src/server/env";
import { runParseJob } from "@/src/server/resume/parse";

export function startWorkers() {
  new Worker(
    "resume-parse",
    async (job) => {
      if (job.name === "parse") await runParseJob(job.data.resumeId);
    },
    { connection: { url: env.REDIS_URL } },
  );
}
```

- [ ] **Step 6: Resume 状态查询 API**

Create `app/api/resumes/[id]/status/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/src/server/db";
import { verifySession } from "@/src/server/auth/session";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ parseStatus: resume.parseStatus });
}
```

- [ ] **Step 7: Commit**

```bash
git add src/server/providers src/server/queue src/server/resume app/api/resumes
git commit -m "feat: upload resume to oss and enqueue parse job"
```

---

## Task 6: 简历解析实现（PDF/DOCX）与诊断生成（LLM）

**Files:**
- Modify: `src/server/resume/parse.ts`
- Create: `src/server/providers/ai/llm.ts`
- Create: `src/server/ai/diagnose.ts`
- Create: `app/api/resumes/[id]/diagnosis/route.ts`

- [ ] **Step 1: 增加解析依赖**

Run:

```bash
pnpm add pdf-parse mammoth
```

- [ ] **Step 2: 下载 OSS 文件（使用 ali-oss get）并解析**

Modify `src/server/resume/parse.ts`:

```ts
import { db } from "@/src/server/db";
import { oss } from "@/src/server/providers/storage/oss";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function parseResumeText(sourceFileKey: string) {
  const res = await oss.get(sourceFileKey);
  const buffer = Buffer.isBuffer(res.content) ? res.content : Buffer.from(res.content as any);

  const lower = sourceFileKey.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (lower.endsWith(".docx")) {
    const out = await mammoth.extractRawText({ buffer });
    return out.value;
  }
  throw new Error("unsupported_file_type");
}

export async function runParseJob(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new Error("resume_not_found");
  await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "PARSING" } });

  try {
    const text = await parseResumeText(resume.sourceFileKey);
    await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "DONE", parsedText: text } });
  } catch (e) {
    await db.resume.update({ where: { id: resumeId }, data: { parseStatus: "FAILED" } });
    throw e;
  }
}
```

- [ ] **Step 3: LLM provider（OpenAI-compatible）**

Create `src/server/providers/ai/llm.ts`:

```ts
import { env } from "@/src/server/env";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatComplete(model: string, messages: ChatMessage[]) {
  const res = await fetch(`${env.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`llm_error:${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return content as string;
}
```

- [ ] **Step 4: 诊断逻辑（输出 JSON：score + issues）**

Create `src/server/ai/diagnose.ts`:

```ts
import { db } from "@/src/server/db";
import { chatComplete } from "@/src/server/providers/ai/llm";
import { env } from "@/src/server/env";

export async function diagnoseResume(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || !resume.parsedText) throw new Error("resume_not_ready");

  const system = [
    "你是资深互联网简历教练。",
    "要求：不得编造用户不存在的经历或指标；不确定必须提示用户补充。",
    "输出严格 JSON：{score:int(0-100), issues:[{title:string, detail:string, priority:'HIGH'|'MED'|'LOW'}]}",
    "issues 至少 8 条；detail 给出可执行建议但避免直接给出可复制完整成稿。",
  ].join("\n");

  const user = [
    `身份：${resume.identityType === "GRAD" ? "应届生" : "互联网1-5年"}`,
    "简历文本如下：",
    resume.parsedText.slice(0, 12000),
  ].join("\n");

  const raw = await chatComplete(env.LLM_MODEL_DIAG, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = JSON.parse(raw) as { score: number; issues: unknown };
  const score = Math.max(0, Math.min(100, Math.floor(parsed.score)));

  return db.diagnosis.upsert({
    where: { resumeId },
    update: { score, issuesJson: parsed.issues },
    create: { resumeId, score, issuesJson: parsed.issues },
  });
}
```

- [ ] **Step 5: 诊断 API**

Create `app/api/resumes/[id]/diagnosis/route.ts`:

```ts
import { NextResponse } from "next/server";
import { verifySession } from "@/src/server/auth/session";
import { db } from "@/src/server/db";
import { diagnoseResume } from "@/src/server/ai/diagnose";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (resume.parseStatus !== "DONE") return NextResponse.json({ error: "not_ready" }, { status: 409 });

  const diagnosis = await diagnoseResume(id);
  return NextResponse.json({ diagnosis });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/server/ai src/server/providers/ai src/server/resume/parse.ts app/api/resumes
git commit -m "feat: parse resume and generate diagnosis via llm"
```

---

## Task 7: 订单创建、支付发起、回调验签、权益发放（核心闭环）

**Files:**
- Create: `src/server/billing/orders.ts`
- Create: `src/server/billing/entitlements.ts`
- Create: `src/server/providers/payments/types.ts`
- Create: `src/server/providers/payments/alipay.ts`
- Create: `src/server/providers/payments/wechat.ts`
- Create: `app/api/orders/create/route.ts`
- Create: `app/api/payments/alipay/notify/route.ts`
- Create: `app/api/payments/wechat/notify/route.ts`
- Test: `tests/billing/entitlements.test.ts`

- [ ] **Step 1: 定义支付 provider 抽象**

Create `src/server/providers/payments/types.ts`:

```ts
export type CreatePaymentArgs = { orderId: string; amountCny: number; subject: string; notifyUrl: string; returnUrl: string };
export type CreatePaymentResult = { type: "FORM" | "URL"; payload: string };

export interface PaymentProvider {
  createPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult>;
  verifyAndParseNotify(req: Request): Promise<{ orderId: string; providerTradeNo: string; amountCny: number }>;
}
```

- [ ] **Step 2: 订单与权益领域逻辑（先实现无支付的纯逻辑+测试）**

Create `src/server/billing/entitlements.ts`:

```ts
import { db } from "@/src/server/db";

export async function grantPlanEntitlement(userId: string, planId: string) {
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("plan_not_found");
  const limits = plan.limitsJson as any;

  return db.entitlement.create({
    data: {
      userId,
      planId,
      remainingGenerations: Number(limits.generations ?? 0),
      remainingExports: Number(limits.exports ?? 0),
      remainingJdCustomizations: Number(limits.jdCustomizations ?? 0),
    },
  });
}
```

Create `tests/billing/entitlements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { db } from "@/src/server/db";
import { grantPlanEntitlement } from "@/src/server/billing/entitlements";

describe("entitlements", () => {
  it("grants plan limits to user", async () => {
    const user = await db.user.create({ data: { phone: `137${Math.floor(Math.random() * 1e8)}`.padEnd(11, "0") } });
    const plan = await db.plan.create({ data: { name: `P-${Date.now()}`, amountCny: 100, limitsJson: { generations: 1, exports: 3, jdCustomizations: 1 } } });
    const e = await grantPlanEntitlement(user.id, plan.id);
    expect(e.remainingExports).toBe(3);
  });
});
```

- [ ] **Step 3: 订单创建 API（生成 order，返回支付 payload）**

Create `src/server/billing/orders.ts`:

```ts
import { db } from "@/src/server/db";

export async function createOrder(userId: string, planId: string) {
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new Error("plan_not_found");
  return db.order.create({
    data: { userId, planId, amountCny: plan.amountCny, status: "PENDING_PAY" },
  });
}

export async function markOrderPaid(orderId: string, provider: "ALIPAY" | "WECHAT", providerTradeNo: string, amountCny: number) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("order_not_found");
  if (order.status === "PAID" || order.status === "FULFILLED") return order;
  if (order.amountCny !== amountCny) throw new Error("amount_mismatch");

  return db.order.update({
    where: { id: orderId },
    data: { status: "PAID", provider, providerTradeNo, paidAt: new Date() },
  });
}
```

Create `app/api/orders/create/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/src/server/auth/session";
import { createOrder } from "@/src/server/billing/orders";

const bodySchema = z.object({ planId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { planId } = bodySchema.parse(json);

  const order = await createOrder(userId, planId);
  return NextResponse.json({ order });
}
```

- [ ] **Step 4: 接入支付宝/微信支付 provider（按官方 SDK 实现）**

Create `src/server/providers/payments/alipay.ts` and `src/server/providers/payments/wechat.ts`：
- `createPayment`：生成表单/支付 URL
- `verifyAndParseNotify`：回调验签（必须校验金额、商户号、appid/mchid、订单号）

Minimum acceptance: 回调验签失败返回 400；成功返回 200，并输出平台要求的成功响应字符串。

- [ ] **Step 5: 回调路由：验签 → 标记 paid → 发放权益（幂等）**

Create `app/api/payments/alipay/notify/route.ts` and `app/api/payments/wechat/notify/route.ts`：
- 读取回调内容（注意微信支付为 V3 加密通知）
- 调用 provider 验签解析出 `{orderId, providerTradeNo, amountCny}`
- `markOrderPaid`（幂等）
- `grantPlanEntitlement`

- [ ] **Step 6: Commit**

```bash
git add src/server/billing src/server/providers/payments app/api/orders app/api/payments tests/billing
git commit -m "feat: create orders, integrate payments, grant entitlements"
```

---

## Task 8: 付费后问答优化（MVP：脚本化追问 + 结构化字段收集）

**Files:**
- Create: `src/server/ai/scripts.ts`
- Create: `src/server/ai/session.ts`
- Create: `app/api/optimize/start/route.ts`
- Create: `app/api/optimize/[sessionId]/message/route.ts`

- [ ] **Step 1: 定义两套问答脚本**

Create `src/server/ai/scripts.ts`:

```ts
export type ScriptQuestion = { key: string; question: string; required: boolean };

export const gradScript: ScriptQuestion[] = [
  { key: "target_role", question: "你投递的岗位方向是什么？（例如：前端/后端/算法）", required: true },
  { key: "best_project", question: "挑一个你最能打的项目：项目背景是什么？你负责什么？", required: true },
  { key: "metrics", question: "这个项目最终结果有什么量化指标？没有也请描述可感知结果。", required: true },
];

export const expScript: ScriptQuestion[] = [
  { key: "most_valuable_project", question: "你最近/最重要的项目：规模（DAU/接口量/并发/数据量）与业务目标？", required: true },
  { key: "hard_problem", question: "你解决过的一个技术难点是什么？为什么难？你怎么做决策？", required: true },
  { key: "impact", question: "你的贡献带来了哪些指标提升/成本下降/稳定性收益？", required: true },
];
```

- [ ] **Step 2: 创建优化会话（校验权益）**

Create `src/server/ai/session.ts`:

```ts
import { db } from "@/src/server/db";

export async function assertCanGenerate(userId: string) {
  const e = await db.entitlement.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!e || e.remainingGenerations <= 0) throw new Error("no_entitlement");
  return e;
}

export async function createQaSession(resumeId: string) {
  return db.qaSession.create({ data: { resumeId, status: "ACTIVE" } });
}
```

- [ ] **Step 3: API - start session**

Create `app/api/optimize/start/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/src/server/auth/session";
import { db } from "@/src/server/db";
import { assertCanGenerate, createQaSession } from "@/src/server/ai/session";

const bodySchema = z.object({ resumeId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { userId } = await verifySession(token);

  const json = await req.json();
  const { resumeId } = bodySchema.parse(json);
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await assertCanGenerate(userId);
  const session = await createQaSession(resumeId);
  return NextResponse.json({ sessionId: session.id });
}
```

- [ ] **Step 4: API - message（MVP：按脚本轮询下一问，不接 LLM）**

Create `app/api/optimize/[sessionId]/message/route.ts`：
- 记录用户回答到 `qa_messages`
- 根据 `identityType` 选脚本
- 读取已有问答数量决定下一问
- 完成脚本后将问答汇总为 `ResumeVersion`（先用简单 JSON 存储，下一 Task 再做 LLM 润色）

- [ ] **Step 5: Commit**

```bash
git add src/server/ai app/api/optimize
git commit -m "feat: paid optimization session with scripted questions"
```

---

## Task 9: 生成简历版本（LLM 润色）与预览

**Files:**
- Create: `src/server/ai/generate.ts`
- Create: `app/api/resumes/[id]/versions/route.ts`
- Create: `app/(app)/preview/[versionId]/page.tsx`

- [ ] **Step 1: 根据问答 + 解析文本生成模板字段 JSON**

Create `src/server/ai/generate.ts`：
- 输入：`resume.parsedText`（截断）、问答汇总、身份类型
- 输出 JSON：`templateFields`（教育/经历/项目/技能分块；每块为数组）
- 约束：不得编造，必须把“不确定项”标记为 `needs_confirmation=true` 并在预览页提示

- [ ] **Step 2: 版本 API**

Create `app/api/resumes/[id]/versions/route.ts`：
- POST：触发生成版本（消耗 `remainingGenerations`，幂等）
- GET：列表（我的简历历史）

- [ ] **Step 3: 预览页**

Create `app/(app)/preview/[versionId]/page.tsx`：
- 服务端拉取 `templateFieldsJson`
- 渲染为可读排版（MVP：简单 HTML，V1 才做复杂模板）

- [ ] **Step 4: Commit**

```bash
git add src/server/ai app/api/resumes app/"(app)"/preview
git commit -m "feat: generate resume version via llm and render preview"
```

---

## Task 10: Word 导出（docx 模板填充）+ 下载链接控制

**Files:**
- Create: `templates/default.docx`
- Create: `src/server/resume/export.ts`
- Create: `app/api/exports/create/route.ts`
- Create: `app/api/exports/download/[token]/route.ts`

- [ ] **Step 1: 增加 docx 模板引擎依赖**

Run:

```bash
pnpm add docxtemplater pizzip
```

- [ ] **Step 2: 放入默认模板**

Create `templates/default.docx`：
- 必须包含模板占位符（例如 `{{name}}`, `{{#projects}}{{title}}{{/projects}}` 等）
- MVP 仅保证中文模板稳定（后续英文版做第二套模板）

- [ ] **Step 3: 导出逻辑**

Create `src/server/resume/export.ts`：
- 校验用户权益 `remainingExports > 0`
- 读取 `ResumeVersion.templateFieldsJson`
- 读取模板文件（本地文件系统）
- docxtemplater 渲染生成 `Buffer`
- 上传至 OSS `exports/{userId}/{versionId}/{timestamp}.docx`
- 创建 `Export` 记录（`downloadToken` 随机、`expiresAt` 10 分钟）
- 扣减 `remainingExports`（事务/串行保证不为负）

- [ ] **Step 4: 创建导出 API**

Create `app/api/exports/create/route.ts`：
- 输入：`versionId`
- 输出：`downloadUrl`

- [ ] **Step 5: 下载 API**

Create `app/api/exports/download/[token]/route.ts`：
- 校验 token、过期时间、归属用户
- 返回 OSS 临时下载（或服务端流式转发）

- [ ] **Step 6: Commit**

```bash
git add templates src/server/resume/export.ts app/api/exports
git commit -m "feat: export resume to docx with short-lived download token"
```

---

## Task 11: 前端页面（MVP 赚钱链路）与 E2E 测试

**Files:**
- Create: `app/(marketing)/page.tsx`（Landing）
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(app)/upload/page.tsx`
- Create: `app/(app)/diagnosis/[resumeId]/page.tsx`
- Create: `app/(app)/optimize/[resumeId]/page.tsx`
- Create: `e2e/happy-path.spec.ts`

- [ ] **Step 1: Landing（强 CTA：登录上传）**
- [ ] **Step 2: 登录页（发送验证码/校验后存 token）**
- [ ] **Step 3: 上传页（身份选择 + 上传 + 轮询解析状态）**
- [ ] **Step 4: 诊断页（免费诊断 + 付费墙 + 购买入口）**
- [ ] **Step 5: 优化页（问答 + 生成版本 + 跳预览）**
- [ ] **Step 6: 预览页（导出按钮、剩余导出次数提示）**

- [ ] **Step 7: Playwright E2E（用 mock 支付/短信 provider）**

Create `e2e/happy-path.spec.ts`：
- 登录：绕过短信（在测试环境用测试接口直接发 token）
- 上传：用内置示例 docx/pdf
- 诊断：mock LLM 返回固定 JSON
- 付费：mock 回调直接发权益
- 导出：校验下载接口返回 200

- [ ] **Step 8: Commit**

```bash
git add app e2e
git commit -m "feat: mvp pages and e2e happy path"
```

---

## Task 12: 合规/风控/可运营能力（MVP 必要最小集）

**Files:**
- Create: `app/(app)/account/page.tsx`
- Create: `app/api/account/delete/route.ts`
- Create: `app/api/admin/health/route.ts`

- [ ] **Step 1: 个人中心（订单、导出、删除数据）**
- [ ] **Step 2: 一键删除（删除简历/版本/导出记录，OSS 文件可延迟删除）**
- [ ] **Step 3: 健康检查与基础监控入口（health）**
- [ ] **Step 4: Commit**

```bash
git add app/api/account app/"(app)"/account app/api/admin
git commit -m "feat: account center, data deletion, health endpoint"
```

---

## Plan 自检（对照 spec）

### 覆盖检查
- 手机号注册登录：Task 3
- 身份选择、上传、解析：Task 5-6
- 免费诊断：Task 6 + Task 11（诊断页）
- 付费墙与套餐：Task 4 + Task 7 + Task 11
- 追问优化：Task 8
- 生成版本与预览：Task 9 + Task 11
- Word 导出：Task 10
- 风控与合规：Task 3/12
- 埋点与 A/B：MVP 先不强制（可在 Task 11 后追加）

### Placeholder 扫描
- 仍未完成的实现点（需工程师按 task 填完）：阿里云短信 SDK 发送、支付宝/微信支付 SDK 集成、docx 模板文件内容、优化 message API 的收敛与最终版本生成细节。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-09-ai-resume-builder.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

