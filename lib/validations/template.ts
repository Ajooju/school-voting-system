import { z } from "zod";
import { requiredString } from "@/lib/validations/common";

export const templateTypeSchema = z.enum(["invoice", "quotation"]);

export const templateFormSchema = z.object({
  id: z.string().trim().optional(),
  name: requiredString("Template name"),
  templateType: templateTypeSchema,
  htmlContent: z.string().default(""),
  cssContent: z.string().default(""),
  editorJson: z.string().default(""),
  isDefault: z.boolean().default(false),
});

export const templateIdSchema = z.object({
  id: requiredString("Template ID"),
});

export type TemplateFormInput = z.infer<typeof templateFormSchema>;
export type TemplateTypeInput = z.infer<typeof templateTypeSchema>;
