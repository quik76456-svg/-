import { PaymentProvider } from "@/server/providers/payments/types";
import { env } from "@/server/env";
import { verifyMockNotify } from "@/server/providers/payments/mock";

export const wechatProvider: PaymentProvider = {
  async createPayment(args) {
    void env.WECHAT_MCH_ID;
    void env.WECHAT_SERIAL_NO;
    void env.WECHAT_PRIVATE_KEY;
    void env.WECHAT_API_V3_KEY;
    void args;
    throw new Error("Not implemented");
  },
  async verifyAndParseNotify(req) {
    return verifyMockNotify(req);
  },
};
