import { z } from "zod";
import { requiredString } from "@/lib/validations/common";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

export const invoiceLineItemInputSchema = z.object({
  description: requiredString("Line item description"),
  quantity: requiredString("Quantity"),
  unitPrice: requiredString("Unit price"),
  discount: z.string().trim().default("0"),
  taxRateBps: z.coerce.number().int().min(0).default(0),
});

export const invoiceDraftInputSchema = z.object({
  businessProfileId: requiredString("Business profile"),
  customerId: requiredString("Customer"),
  issueDate: requiredString("Issue date"),
  dueDate: optionalText,
  notes: optionalText,
  terms: optionalText,
  lineItems: z.array(invoiceLineItemInputSchema).min(1, "At least one line item is required."),
});

export const invoiceIdSchema = z.object({
  id: requiredString("Invoice ID"),
});

export type InvoiceDraftInput = z.infer<typeof invoiceDraftInputSchema>;
