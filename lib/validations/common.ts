import { z } from "zod";

export const requiredString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

export const idSchema = z.string().trim().min(1, "ID is required.");

export const emailSchema = z.string().trim().email("Enter a valid email address.");

export const optionalEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .optional()
  .or(z.literal(""));

export const minorUnitAmountSchema = z
  .number()
  .int("Amount must be stored as integer minor units.")
  .min(0, "Amount cannot be negative.");

export const isoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid ISO date.");
