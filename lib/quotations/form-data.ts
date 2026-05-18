import { quotationDraftInputSchema } from "@/lib/validations/quotation";

export function parseQuotationDraftFormData(formData: FormData) {
  const descriptions = formData.getAll("description");
  const quantities = formData.getAll("quantity");
  const unitPrices = formData.getAll("unitPrice");
  const discounts = formData.getAll("discount");
  const taxRates = formData.getAll("taxRateBps");
  const lineItems = descriptions.map((description, index) => ({
    description,
    quantity: quantities[index] ?? "",
    unitPrice: unitPrices[index] ?? "",
    discount: discounts[index] ?? "0",
    taxRateBps: taxRates[index] ?? "0",
  }));

  return quotationDraftInputSchema.parse({
    businessProfileId: formData.get("businessProfileId"),
    customerId: formData.get("customerId"),
    issueDate: formData.get("issueDate"),
    expiryDate: formData.get("expiryDate"),
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    lineItems,
  });
}
