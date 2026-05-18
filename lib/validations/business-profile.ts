import { z } from "zod";
import { requiredString } from "@/lib/validations/common";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

export const businessProfileFormSchema = z.object({
  businessName: requiredString("Business name"),
  defaultCurrencyCode: requiredString("Default currency"),
  address: optionalText,
  phone: optionalText,
  email: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(z.string().email("Enter a valid email address.").nullable()),
  taxNumber: optionalText,
  notes: optionalText,
});

export const businessProfileIdSchema = z.object({
  id: requiredString("Business profile ID"),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileFormSchema>;
