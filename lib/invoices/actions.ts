"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { createInvoicePdfBytes } from "@/lib/documents/pdf";
import { uploadGeneratedPdf } from "@/lib/documents/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateDraftInvoiceAmounts } from "@/lib/invoices/calculations";
import { calculateInvoiceTotals, calculateLineTotals } from "@/lib/money/money";
import { getNextDocumentNumberInTransaction } from "@/lib/numbering";
import { parseInvoiceDraftFormData } from "@/lib/invoices/form-data";
import { invoiceIdSchema } from "@/lib/validations/invoice";

async function requireAuthenticatedOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage invoices.");
  }
}

function parseDate(value: string, fieldName: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
}


function getOptionalText(formData: FormData, fieldName: string) {
  const value = String(formData.get(fieldName) ?? "").trim();

  return value.length > 0 ? value : null;
}

async function getBusinessCurrencyCode(businessProfileId: string) {
  const businessProfile = await prisma.businessProfile.findUnique({
    where: {
      id: businessProfileId,
    },
    select: {
      defaultCurrencyCode: true,
    },
  });

  if (!businessProfile) {
    throw new Error("Selected business profile was not found.");
  }

  return businessProfile.defaultCurrencyCode;
}

export async function createDraftInvoice(formData: FormData) {
  await requireAuthenticatedOwner();

  const input = parseInvoiceDraftFormData(formData);
  const currencyCode = await getBusinessCurrencyCode(input.businessProfileId);
  const { lineItems, totals } = calculateDraftInvoiceAmounts(input);
  const invoice = await prisma.invoice.create({
    data: {
      businessProfileId: input.businessProfileId,
      customerId: input.customerId,
      invoiceNumber: null,
      status: "DRAFT",
      currencyCode,
      issueDate: parseDate(input.issueDate, "Issue date"),
      dueDate: input.dueDate ? parseDate(input.dueDate, "Due date") : null,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      balanceDue: totals.totalAmount,
      notes: input.notes,
      terms: input.terms,
      lineItems: {
        create: lineItems.map(toLineItemCreateData),
      },
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateDraftInvoice(invoiceId: string, formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = invoiceIdSchema.parse({ id: invoiceId });
  const existingInvoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    select: {
      status: true,
    },
  });

  if (!existingInvoice) {
    throw new Error("Invoice was not found.");
  }

  if (existingInvoice.status !== "DRAFT") {
    throw new Error("Only draft invoices can be edited.");
  }

  const input = parseInvoiceDraftFormData(formData);
  const currencyCode = await getBusinessCurrencyCode(input.businessProfileId);
  const { lineItems, totals } = calculateDraftInvoiceAmounts(input);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLineItem.deleteMany({
      where: {
        invoiceId: id,
      },
    });
    await tx.invoice.update({
      where: {
        id,
      },
      data: {
        businessProfileId: input.businessProfileId,
        customerId: input.customerId,
        currencyCode,
        issueDate: parseDate(input.issueDate, "Issue date"),
        dueDate: input.dueDate ? parseDate(input.dueDate, "Due date") : null,
        subtotalAmount: totals.subtotalAmount,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        balanceDue: totals.totalAmount,
        notes: input.notes,
        terms: input.terms,
        lineItems: {
          create: lineItems.map(toLineItemCreateData),
        },
      },
    });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}


export async function finalizeDraftInvoice(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = invoiceIdSchema.parse({
    id: formData.get("id"),
  });

  const finalizedInvoice = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: {
        id,
      },
      include: {
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
        },
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

    if (invoice.status !== "DRAFT") {
      throw new Error("Only draft invoices can be finalized.");
    }

    if (invoice.invoiceNumber) {
      throw new Error("This invoice already has an invoice number.");
    }

    if (invoice.lineItems.length === 0) {
      throw new Error("Cannot finalize an invoice without line items.");
    }

    const recalculatedLineItems = invoice.lineItems.map((lineItem) => {
      const totals = calculateLineTotals({
        quantity: lineItem.quantity.toString(),
        unitPriceAmount: lineItem.unitPriceAmount,
        discountAmount: lineItem.discountAmount,
        taxRateBps: lineItem.taxRateBps,
      });

      return {
        id: lineItem.id,
        subtotalAmount: totals.subtotalAmount,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        lineTotalAmount: totals.lineTotalAmount,
      };
    });
    const totals = calculateInvoiceTotals(recalculatedLineItems);
    const paidAmount = invoice.payments.reduce((total, payment) => total + payment.amount, 0);
    const invoiceNumber = await getNextDocumentNumberInTransaction(tx, "invoice", invoice.issueDate);

    await Promise.all(
      recalculatedLineItems.map((lineItem) =>
        tx.invoiceLineItem.update({
          where: {
            id: lineItem.id,
          },
          data: {
            discountAmount: lineItem.discountAmount,
            taxAmount: lineItem.taxAmount,
            lineTotalAmount: lineItem.lineTotalAmount,
          },
        }),
      ),
    );

    return tx.invoice.update({
      where: {
        id,
      },
      data: {
        invoiceNumber,
        status: "FINALIZED",
        finalizedAt: new Date(),
        subtotalAmount: totals.subtotalAmount,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        paidAmount,
        balanceDue: totals.totalAmount - paidAmount,
      },
      select: {
        id: true,
      },
    });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${finalizedInvoice.id}`);
  redirect(`/invoices/${finalizedInvoice.id}`);
}

export async function updateFinalizedInvoiceDetails(invoiceId: string, formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = invoiceIdSchema.parse({ id: invoiceId });
  const dueDateValue = getOptionalText(formData, "dueDate");
  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    select: {
      status: true,
      invoiceNumber: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice was not found.");
  }

  if (invoice.status === "DRAFT" || !invoice.invoiceNumber) {
    throw new Error("Only finalized invoices can use this safe edit action.");
  }

  await prisma.invoice.update({
    where: {
      id,
    },
    data: {
      dueDate: dueDateValue ? parseDate(dueDateValue, "Due date") : null,
      notes: getOptionalText(formData, "notes"),
      terms: getOptionalText(formData, "terms"),
      invoicePdfUrl: null,
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function generateInvoicePdf(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = invoiceIdSchema.parse({
    id: formData.get("id"),
  });
  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    include: {
      businessProfile: true,
      customer: true,
      lineItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      payments: {
        orderBy: {
          paymentDate: "asc",
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice was not found.");
  }

  if (!invoice.invoiceNumber || invoice.status === "DRAFT") {
    throw new Error("Only finalized invoices can be exported to PDF.");
  }

  const template = await prisma.documentTemplate.findFirst({
    where: {
      isDefault: true,
      templateType: "INVOICE",
    },
    select: {
      sourceType: true,
      htmlContent: true,
      cssContent: true,
      uploadedFileUrl: true,
      fields: true,
    },
  });

  const pdfBytes = await createInvoicePdfBytes({
    invoiceNumber: invoice.invoiceNumber,
    currencyCode: invoice.currencyCode,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotalAmount: invoice.subtotalAmount,
    discountAmount: invoice.discountAmount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceDue: invoice.balanceDue,
    notes: invoice.notes,
    terms: invoice.terms,
    businessProfile: invoice.businessProfile,
    customer: invoice.customer,
    lineItems: invoice.lineItems,
    payments: invoice.payments,
    template,
  });
  const invoicePdfUrl = await uploadDocumentPdf(`invoices/${invoice.id}/${invoice.invoiceNumber}.pdf`, pdfBytes);

  await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      invoicePdfUrl,
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
}

async function uploadDocumentPdf(path: string, pdfBytes: Uint8Array) {
  return uploadGeneratedPdf(path, pdfBytes);
}

export async function deleteDraftInvoice(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = invoiceIdSchema.parse({
    id: formData.get("id"),
  });
  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    select: {
      status: true,
    },
  });

  if (!invoice) {
    return;
  }

  if (invoice.status !== "DRAFT") {
    throw new Error("Only draft invoices can be deleted.");
  }

  await prisma.invoice.delete({
    where: {
      id,
    },
  });

  revalidatePath("/invoices");
  redirect("/invoices");
}

function toLineItemCreateData(lineItem: ReturnType<typeof calculateDraftInvoiceAmounts>["lineItems"][number]) {
  return {
    description: lineItem.description,
    quantity: lineItem.quantity,
    unitPriceAmount: lineItem.unitPriceAmount,
    discountAmount: lineItem.discountAmount,
    taxRateBps: lineItem.taxRateBps,
    taxAmount: lineItem.taxAmount,
    lineTotalAmount: lineItem.lineTotalAmount,
    sortOrder: lineItem.sortOrder,
  };
}
