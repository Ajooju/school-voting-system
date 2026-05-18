import { z } from "zod";
import { requiredString } from "@/lib/validations/common";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

export const customerFormSchema = z.object({
  name: requiredString("Customer name"),
  email: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(z.string().email("Enter a valid email address.").nullable()),
  phone: optionalText,
  address: optionalText,
  taxNumber: optionalText,
  notes: optionalText,
});

export const customerIdSchema = z.object({
  id: requiredString("Customer ID"),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormValues = z.infer<typeof customerFormSchema>;
