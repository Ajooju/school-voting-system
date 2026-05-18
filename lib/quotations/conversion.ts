export type ConvertibleQuotationLineItem = Readonly<{
  description: string;
  discountAmount: number;
  lineTotalAmount: number;
  quantity: { toString(): string };
  sortOrder: number;
  taxAmount: number;
  taxRateBps: number;
  unitPriceAmount: number;
}>;

export type ConvertibleQuotation = Readonly<{
  businessProfileId: string;
  currencyCode: string;
  customerId: string;
  id: string;
  issueDate: Date;
  lineItems: readonly ConvertibleQuotationLineItem[];
  notes: string | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  terms: string | null;
  totalAmount: number;
}>;

export function createDraftInvoiceFromQuotationData(quotation: ConvertibleQuotation) {
  if (quotation.lineItems.length === 0) {
    throw new Error("Cannot convert a quotation without line items.");
  }

  return {
    quotationId: quotation.id,
    businessProfileId: quotation.businessProfileId,
    customerId: quotation.customerId,
    invoiceNumber: null,
    status: "DRAFT" as const,
    currencyCode: quotation.currencyCode,
    issueDate: quotation.issueDate,
    dueDate: null,
    subtotalAmount: quotation.subtotalAmount,
    taxAmount: quotation.taxAmount,
    discountAmount: quotation.discountAmount,
    totalAmount: quotation.totalAmount,
    paidAmount: 0,
    balanceDue: quotation.totalAmount,
    notes: quotation.notes,
    terms: quotation.terms,
    lineItems: {
      create: quotation.lineItems.map((lineItem) => ({
        description: lineItem.description,
        quantity: lineItem.quantity.toString(),
        unitPriceAmount: lineItem.unitPriceAmount,
        discountAmount: lineItem.discountAmount,
        taxRateBps: lineItem.taxRateBps,
        taxAmount: lineItem.taxAmount,
        lineTotalAmount: lineItem.lineTotalAmount,
        sortOrder: lineItem.sortOrder,
      })),
    },
  };
}
