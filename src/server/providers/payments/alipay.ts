import { PaymentProvider } from "@/server/providers/payments/types";
import { env } from "@/server/env";

export const alipayProvider: PaymentProvider = {
  async createPayment(args) {
    void env.ALIPAY_APP_ID;
    void env.ALIPAY_PRIVATE_KEY;
    void env.ALIPAY_ALIPAY_PUBLIC_KEY;
    void args;
    throw new Error("Not implemented");
  },
  async verifyAndParseNotify(req) {
    void req;
    throw new Error("Not implemented");
  },
};
