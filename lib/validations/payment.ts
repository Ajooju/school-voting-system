import { z } from "zod";
import { requiredString } from "@/lib/validations/common";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

export const paymentFormSchema = z.object({
  invoiceId: requiredString("Invoice ID"),
  paymentDate: requiredString("Payment date"),
  amount: requiredString("Payment amount"),
  paymentMethod: z.enum(["cash", "bank_transfer", "card", "cheque", "other"]),
  referenceNumber: optionalText,
  notes: optionalText,
});

export const paymentIdSchema = z.object({
  id: requiredString("Payment ID"),
});
