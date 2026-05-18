import { invoiceDraftInputSchema } from "@/lib/validations/invoice";

export function parseInvoiceDraftFormData(formData: FormData) {
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

  return invoiceDraftInputSchema.parse({
    businessProfileId: formData.get("businessProfileId"),
    customerId: formData.get("customerId"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    lineItems,
  });
}
