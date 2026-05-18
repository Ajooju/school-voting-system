import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDraftInvoiceFromQuotationData } from "../lib/quotations/conversion.ts";

describe("quotation-to-invoice conversion", () => {
  it("creates a draft invoice without consuming an invoice number", () => {
    const issueDate = new Date("2026-05-18T00:00:00.000Z");
    const invoiceData = createDraftInvoiceFromQuotationData({
      id: "quotation_1",
      businessProfileId: "business_1",
      customerId: "customer_1",
      currencyCode: "USD",
      issueDate,
      subtotalAmount: 10_000,
      discountAmount: 1_000,
      taxAmount: 540,
      totalAmount: 9_540,
      notes: "Notes",
      terms: "Terms",
      lineItems: [
        {
          description: "Design work",
          quantity: "2",
          unitPriceAmount: 5_000,
          discountAmount: 1_000,
          taxRateBps: 600,
          taxAmount: 540,
          lineTotalAmount: 9_540,
          sortOrder: 0,
        },
      ],
    });

    assert.equal(invoiceData.invoiceNumber, null);
    assert.equal(invoiceData.status, "DRAFT");
    assert.equal(invoiceData.quotationId, "quotation_1");
    assert.equal(invoiceData.paidAmount, 0);
    assert.equal(invoiceData.balanceDue, 9_540);
    assert.deepEqual(invoiceData.lineItems.create, [
      {
        description: "Design work",
        quantity: "2",
        unitPriceAmount: 5_000,
        discountAmount: 1_000,
        taxRateBps: 600,
        taxAmount: 540,
        lineTotalAmount: 9_540,
        sortOrder: 0,
      },
    ]);
  });

  it("rejects quotations without line items", () => {
    assert.throws(
      () =>
        createDraftInvoiceFromQuotationData({
          id: "quotation_1",
          businessProfileId: "business_1",
          customerId: "customer_1",
          currencyCode: "USD",
          issueDate: new Date("2026-05-18T00:00:00.000Z"),
          subtotalAmount: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: null,
          terms: null,
          lineItems: [],
        }),
      /without line items/,
    );
  });
});
