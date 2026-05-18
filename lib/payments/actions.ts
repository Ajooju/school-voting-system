"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumberInTransaction } from "@/lib/numbering";
import { uploadGeneratedPdf } from "@/lib/documents/storage";
import { createReceiptPdfBytes } from "@/lib/receipts/pdf";
import { parseDisplayAmountToMinorUnits } from "@/lib/money/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { paymentFormSchema, paymentIdSchema } from "@/lib/validations/payment";
import { calculateInvoicePaymentState } from "@/lib/payments/status";

type PaymentActionResult = {
  error?: string;
  success?: string;
};

const payableInvoiceStatuses = new Set(["FINALIZED", "SENT", "PARTIALLY_PAID"]);

async function requireAuthenticatedOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage payments.");
  }
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Payment date must be a valid date.");
  }

  return date;
}

function toPrismaPaymentMethod(paymentMethod: string) {
  return paymentMethod.toUpperCase() as "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";
}

export async function createInvoicePayment(input: unknown): Promise<PaymentActionResult> {
  await requireAuthenticatedOwner();

  const parsed = paymentFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment details." };
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: parsed.data.invoiceId,
    },
    select: {
      currencyCode: true,
      status: true,
    },
  });

  if (!invoice) {
    return { error: "Invoice was not found." };
  }

  if (!payableInvoiceStatuses.has(invoice.status)) {
    return { error: "Payments are only allowed for finalized, sent, or partially paid invoices." };
  }

  const amount = parseDisplayAmountToMinorUnits(parsed.data.amount);

  if (amount <= 0) {
    return { error: "Payment amount must be greater than zero." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.create({
      data: {
        invoiceId: parsed.data.invoiceId,
        paymentDate: parseDate(parsed.data.paymentDate),
        amount,
        currencyCode: invoice.currencyCode,
        paymentMethod: toPrismaPaymentMethod(parsed.data.paymentMethod),
        referenceNumber: parsed.data.referenceNumber,
        notes: parsed.data.notes,
      },
    });
    await recalculateInvoicePaymentState(tx, parsed.data.invoiceId);
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.data.invoiceId}`);

  return { success: "Payment added." };
}

export async function updateInvoicePayment(paymentId: string, input: unknown): Promise<PaymentActionResult> {
  await requireAuthenticatedOwner();

  const parsedId = paymentIdSchema.safeParse({ id: paymentId });

  if (!parsedId.success) {
    return { error: parsedId.error.issues[0]?.message ?? "Invalid payment ID." };
  }

  const parsed = paymentFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment details." };
  }

  const existingPayment = await prisma.invoicePayment.findUnique({
    where: {
      id: parsedId.data.id,
    },
    include: {
      invoice: {
        select: {
          id: true,
          currencyCode: true,
          status: true,
        },
      },
    },
  });

  if (!existingPayment) {
    return { error: "Payment was not found." };
  }

  if (existingPayment.invoice.id !== parsed.data.invoiceId) {
    return { error: "Payment invoice cannot be changed." };
  }

  if (!payableInvoiceStatuses.has(existingPayment.invoice.status) && existingPayment.invoice.status !== "PAID") {
    return { error: "Payments cannot be edited for this invoice status." };
  }

  const amount = parseDisplayAmountToMinorUnits(parsed.data.amount);

  if (amount <= 0) {
    return { error: "Payment amount must be greater than zero." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.update({
      where: {
        id: parsedId.data.id,
      },
      data: {
        paymentDate: parseDate(parsed.data.paymentDate),
        amount,
        currencyCode: existingPayment.invoice.currencyCode,
        paymentMethod: toPrismaPaymentMethod(parsed.data.paymentMethod),
        referenceNumber: parsed.data.referenceNumber,
        notes: parsed.data.notes,
      },
    });
    await recalculateInvoicePaymentState(tx, existingPayment.invoice.id);
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${existingPayment.invoice.id}`);

  return { success: "Payment updated." };
}

export async function deleteInvoicePayment(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = paymentIdSchema.parse({
    id: formData.get("id"),
  });
  const payment = await prisma.invoicePayment.findUnique({
    where: {
      id,
    },
    select: {
      invoiceId: true,
    },
  });

  if (!payment) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.delete({
      where: {
        id,
      },
    });
    await recalculateInvoicePaymentState(tx, payment.invoiceId);
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${payment.invoiceId}`);
}

export async function generateInvoicePaymentReceipt(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = paymentIdSchema.parse({
    id: formData.get("id"),
  });

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const payment = await tx.invoicePayment.findUnique({
      where: {
        id,
      },
      include: {
        invoice: {
          include: {
            businessProfile: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error("Payment was not found.");
    }

    if (!payment.invoice.invoiceNumber || payment.invoice.status === "DRAFT") {
      throw new Error("Receipts can only be generated for finalized invoices.");
    }

    if (payment.receiptPdfUrl) {
      return payment;
    }

    const receiptNumber = payment.receiptNumber ?? (await getNextDocumentNumberInTransaction(tx, "receipt", payment.paymentDate));
    const pdfBytes = await createReceiptPdfBytes({
      receiptNumber,
      receiptDate: payment.paymentDate,
      business: {
        name: payment.invoice.businessProfile.businessName,
        address: payment.invoice.businessProfile.address,
        phone: payment.invoice.businessProfile.phone,
        email: payment.invoice.businessProfile.email,
        taxNumber: payment.invoice.businessProfile.taxNumber,
        logoFileUrl: payment.invoice.businessProfile.logoFileUrl,
      },
      customer: {
        name: payment.invoice.customer.name,
      },
      invoice: {
        invoiceNumber: payment.invoice.invoiceNumber,
        balanceDue: payment.invoice.balanceDue,
      },
      payment: {
        amount: payment.amount,
        currencyCode: payment.currencyCode,
        method: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
      },
    });
    const receiptPdfUrl = await uploadReceiptPdf(payment.id, receiptNumber, pdfBytes);

    return tx.invoicePayment.update({
      where: {
        id: payment.id,
      },
      data: {
        receiptNumber,
        receiptPdfUrl,
      },
    });
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${updatedPayment.invoiceId}`);
}

async function uploadReceiptPdf(paymentId: string, receiptNumber: string, pdfBytes: Uint8Array) {
  return uploadGeneratedPdf(`receipts/${paymentId}/${receiptNumber}.pdf`, pdfBytes);
}

async function recalculateInvoicePaymentState(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      payments: {
        select: {
          amount: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice was not found.");
  }

  const paymentState = calculateInvoicePaymentState({
    currentStatus: invoice.status,
    paymentAmounts: invoice.payments.map((payment) => payment.amount),
    totalAmount: invoice.totalAmount,
  });

  await tx.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      paidAmount: paymentState.paidAmount,
      balanceDue: paymentState.balanceDue,
      status: paymentState.status,
      invoicePdfUrl: null,
    },
  });
}
