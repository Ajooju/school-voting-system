export type PaymentStatusInput = Readonly<{
  currentStatus: string;
  paymentAmounts: readonly number[];
  totalAmount: number;
}>;

export type PaymentStatusResult = Readonly<{
  balanceDue: number;
  paidAmount: number;
  status: "FINALIZED" | "PARTIALLY_PAID" | "PAID" | "SENT";
}>;

export function calculateInvoicePaymentState({
  currentStatus,
  paymentAmounts,
  totalAmount,
}: PaymentStatusInput): PaymentStatusResult {
  assertIntegerMoney(totalAmount, "Invoice total must be integer minor units.");

  if (totalAmount < 0) {
    throw new Error("Invoice total cannot be negative.");
  }

  const paidAmount = paymentAmounts.reduce((total, amount) => {
    assertIntegerMoney(amount, "Payment amount must be integer minor units.");

    if (amount <= 0) {
      throw new Error("Payment amounts must be greater than zero.");
    }

    return total + amount;
  }, 0);

  if (paidAmount > totalAmount) {
    throw new Error("Total payments cannot exceed the invoice total.");
  }

  const balanceDue = totalAmount - paidAmount;

  if (balanceDue <= 0) {
    return {
      balanceDue,
      paidAmount,
      status: "PAID",
    };
  }

  if (paidAmount > 0) {
    return {
      balanceDue,
      paidAmount,
      status: "PARTIALLY_PAID",
    };
  }

  return {
    balanceDue,
    paidAmount,
    status: currentStatus === "SENT" ? "SENT" : "FINALIZED",
  };
}

function assertIntegerMoney(amount: number, message: string) {
  if (!Number.isSafeInteger(amount)) {
    throw new Error(message);
  }
}
