import { PaymentProvider } from "@/server/providers/payments/types";
import { env } from "@/server/env";
import { verifyMockNotify } from "@/server/providers/payments/mock";

export const alipayProvider: PaymentProvider = {
  async createPayment(args) {
    void env.ALIPAY_APP_ID;
    void env.ALIPAY_PRIVATE_KEY;
    void env.ALIPAY_ALIPAY_PUBLIC_KEY;
    void args;
    throw new Error("Not implemented");
  },
  async verifyAndParseNotify(req) {
    return verifyMockNotify(req);
  },
};
