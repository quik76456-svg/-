import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  APP_URL: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(1),

  OSS_ACCESS_KEY_ID: z.string().optional(),
  OSS_ACCESS_KEY_SECRET: z.string().optional(),
  OSS_BUCKET: z.string().optional(),
  OSS_REGION: z.string().optional(),
  OSS_ENDPOINT: z.string().optional(),

  SMS_ALIYUN_ACCESS_KEY_ID: z.string().optional(),
  SMS_ALIYUN_ACCESS_KEY_SECRET: z.string().optional(),
  SMS_ALIYUN_SIGN_NAME: z.string().optional(),
  SMS_ALIYUN_TEMPLATE_CODE_LOGIN: z.string().optional(),

  ALIPAY_APP_ID: z.string().optional(),
  ALIPAY_PRIVATE_KEY: z.string().optional(),
  ALIPAY_ALIPAY_PUBLIC_KEY: z.string().optional(),

  WECHAT_MCH_ID: z.string().optional(),
  WECHAT_SERIAL_NO: z.string().optional(),
  WECHAT_PRIVATE_KEY: z.string().optional(),
  WECHAT_API_V3_KEY: z.string().optional(),

  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL_DIAG: z.string().optional(),
  LLM_MODEL_FINAL: z.string().optional(),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  APP_URL: process.env.APP_URL,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,

  OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID,
  OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET,
  OSS_BUCKET: process.env.OSS_BUCKET,
  OSS_REGION: process.env.OSS_REGION,
  OSS_ENDPOINT: process.env.OSS_ENDPOINT,

  SMS_ALIYUN_ACCESS_KEY_ID: process.env.SMS_ALIYUN_ACCESS_KEY_ID,
  SMS_ALIYUN_ACCESS_KEY_SECRET: process.env.SMS_ALIYUN_ACCESS_KEY_SECRET,
  SMS_ALIYUN_SIGN_NAME: process.env.SMS_ALIYUN_SIGN_NAME,
  SMS_ALIYUN_TEMPLATE_CODE_LOGIN: process.env.SMS_ALIYUN_TEMPLATE_CODE_LOGIN,

  ALIPAY_APP_ID: process.env.ALIPAY_APP_ID,
  ALIPAY_PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY,
  ALIPAY_ALIPAY_PUBLIC_KEY: process.env.ALIPAY_ALIPAY_PUBLIC_KEY,

  WECHAT_MCH_ID: process.env.WECHAT_MCH_ID,
  WECHAT_SERIAL_NO: process.env.WECHAT_SERIAL_NO,
  WECHAT_PRIVATE_KEY: process.env.WECHAT_PRIVATE_KEY,
  WECHAT_API_V3_KEY: process.env.WECHAT_API_V3_KEY,

  LLM_BASE_URL: process.env.LLM_BASE_URL,
  LLM_API_KEY: process.env.LLM_API_KEY,
  LLM_MODEL_DIAG: process.env.LLM_MODEL_DIAG,
  LLM_MODEL_FINAL: process.env.LLM_MODEL_FINAL,
});
