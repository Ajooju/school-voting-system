import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateInvoicePaymentState } from "../lib/payments/status.ts";

describe("payment status updates", () => {
  it("keeps a sent invoice sent when there are no payments", () => {
    assert.deepEqual(
      calculateInvoicePaymentState({
        currentStatus: "SENT",
        paymentAmounts: [],
        totalAmount: 10_000,
      }),
      {
        paidAmount: 0,
        balanceDue: 10_000,
        status: "SENT",
      },
    );
  });

  it("marks invoices as partially paid when payments do not cover the total", () => {
    assert.deepEqual(
      calculateInvoicePaymentState({
        currentStatus: "FINALIZED",
        paymentAmounts: [2_500, 1_500],
        totalAmount: 10_000,
      }),
      {
        paidAmount: 4_000,
        balanceDue: 6_000,
        status: "PARTIALLY_PAID",
      },
    );
  });

  it("marks invoices as paid when payments exactly cover the total", () => {
    assert.deepEqual(
      calculateInvoicePaymentState({
        currentStatus: "PARTIALLY_PAID",
        paymentAmounts: [4_000, 6_000],
        totalAmount: 10_000,
      }),
      {
        paidAmount: 10_000,
        balanceDue: 0,
        status: "PAID",
      },
    );
  });

  it("rejects overpayments", () => {
    assert.throws(
      () => calculateInvoicePaymentState({ currentStatus: "FINALIZED", paymentAmounts: [10_001], totalAmount: 10_000 }),
      /cannot exceed/,
    );
  });
});
