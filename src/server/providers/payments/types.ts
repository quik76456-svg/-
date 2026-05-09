export type CreatePaymentArgs = { orderId: string; amountCny: number; subject: string; notifyUrl: string; returnUrl: string };
export type CreatePaymentResult = { type: "FORM" | "URL"; payload: string };

export interface PaymentProvider {
  createPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult>;
  verifyAndParseNotify(req: Request): Promise<{ orderId: string; providerTradeNo: string; amountCny: number }>;
}

