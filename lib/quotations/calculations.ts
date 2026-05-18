import {
  calculateInvoiceTotals,
  calculateLineTotals,
  parseDisplayAmountToMinorUnits,
} from "@/lib/money/money";
import type { QuotationDraftInput } from "@/lib/validations/quotation";

export function calculateDraftQuotationAmounts(input: QuotationDraftInput) {
  const lineItems = input.lineItems.map((lineItem, index) => {
    const unitPriceAmount = parseDisplayAmountToMinorUnits(lineItem.unitPrice);
    const discountAmount = parseDisplayAmountToMinorUnits(lineItem.discount || "0");
    const totals = calculateLineTotals({
      quantity: lineItem.quantity,
      unitPriceAmount,
      discountAmount,
      taxRateBps: lineItem.taxRateBps,
    });

    return {
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitPriceAmount,
      discountAmount: totals.discountAmount,
      taxRateBps: lineItem.taxRateBps,
      taxAmount: totals.taxAmount,
      lineTotalAmount: totals.lineTotalAmount,
      subtotalAmount: totals.subtotalAmount,
      sortOrder: index,
    };
  });
  const totals = calculateInvoiceTotals(lineItems);

  return {
    lineItems,
    totals,
  };
}
