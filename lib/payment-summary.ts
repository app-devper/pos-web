import type { Order, OrderDetail, OrderDetailPayment } from "@/types/pos";

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  CREDIT: "บัตรเครดิต",
  PROMPTPAY: "พร้อมเพย์",
  TRANSFER: "โอนเงิน",
};

export function getOrderPayments(order: Order | OrderDetail): OrderDetailPayment[] {
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    return order.payments;
  }

  const detailOrder = order as OrderDetail;
  return detailOrder.payment ? [detailOrder.payment] : [];
}

export function getPaymentSummary(
  order: Order | OrderDetail,
  formatAmount: (amount: number) => string
): string {
  const payments = getOrderPayments(order);

  if (payments.length === 0) {
    return PAYMENT_LABEL[order.type] ?? order.type;
  }

  return payments
    .map((payment) => `${PAYMENT_LABEL[payment.type] ?? payment.type} ${formatAmount(payment.amount ?? 0)}`)
    .join(", ");
}
