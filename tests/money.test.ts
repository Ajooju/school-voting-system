import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateInvoiceTotals,
  calculateLineTotals,
  calculateTax,
  formatMinorUnitsByCurrency,
  parseDisplayAmountToMinorUnits,
} from "../lib/money/money.ts";

describe("money utilities", () => {
  it("formats MVR minor units", () => {
    assert.equal(formatMinorUnitsByCurrency(123456, "MVR"), "Rf 1,234.56");
  });

  it("formats USD minor units", () => {
    assert.equal(formatMinorUnitsByCurrency(123456, "USD"), "$1,234.56");
  });

  it("parses display amounts to integer minor units", () => {
    assert.equal(parseDisplayAmountToMinorUnits("1,234.50"), 123450);
  });

  it("returns zero tax for a zero basis-point rate", () => {
    assert.equal(calculateTax(10_000, 0), 0);
  });

  it("calculates tax from basis points", () => {
    assert.equal(calculateTax(10_000, 600), 600);
  });

  it("applies line discounts before tax", () => {
    assert.deepEqual(
      calculateLineTotals({
        quantity: "2",
        unitPriceAmount: 5_000,
        discountAmount: 1_000,
        taxRateBps: 0,
      }),
      {
        subtotalAmount: 10_000,
        discountAmount: 1_000,
        taxableAmount: 9_000,
        taxAmount: 0,
        lineTotalAmount: 9_000,
      },
    );
  });

  it("rounds fractional quantity totals using integer math", () => {
    assert.deepEqual(
      calculateLineTotals({
        quantity: "1.3333",
        unitPriceAmount: 999,
        discountAmount: 0,
        taxRateBps: 0,
      }),
      {
        subtotalAmount: 1_332,
        discountAmount: 0,
        taxableAmount: 1_332,
        taxAmount: 0,
        lineTotalAmount: 1_332,
      },
    );
  });

  it("rejects money amounts with too many decimal places", () => {
    assert.throws(() => parseDisplayAmountToMinorUnits("1.999"), /more than 2 decimal places/);
  });

  it("calculates invoice totals", () => {
    const line = calculateLineTotals({
      quantity: "2",
      unitPriceAmount: 5_000,
      discountAmount: 1_000,
      taxRateBps: 600,
    });

    assert.deepEqual(calculateInvoiceTotals([line]), {
      subtotalAmount: 10_000,
      discountAmount: 1_000,
      taxAmount: 540,
      totalAmount: 9_540,
    });
  });
});
