"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createQuotationPdfBytes } from "@/lib/documents/pdf";
import { uploadGeneratedPdf } from "@/lib/documents/storage";
import { calculateDraftQuotationAmounts } from "@/lib/quotations/calculations";
import { parseQuotationDraftFormData } from "@/lib/quotations/form-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNextDocumentNumberInTransaction } from "@/lib/numbering";
import { calculateInvoiceTotals, calculateLineTotals } from "@/lib/money/money";
import { quotationIdSchema } from "@/lib/validations/quotation";
import { createDraftInvoiceFromQuotationData } from "@/lib/quotations/conversion";

async function requireAuthenticatedOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage quotations.");
  }
}

function parseDate(value: string, fieldName: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
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

export async function createDraftQuotation(formData: FormData) {
  await requireAuthenticatedOwner();

  const input = parseQuotationDraftFormData(formData);
  const currencyCode = await getBusinessCurrencyCode(input.businessProfileId);
  const { lineItems, totals } = calculateDraftQuotationAmounts(input);
  const quotation = await prisma.quotation.create({
    data: {
      businessProfileId: input.businessProfileId,
      customerId: input.customerId,
      quotationNumber: null,
      status: "DRAFT",
      currencyCode,
      issueDate: parseDate(input.issueDate, "Issue date"),
      expiryDate: input.expiryDate ? parseDate(input.expiryDate, "Expiry date") : null,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
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

  revalidatePath("/quotations");
  redirect(`/quotations/${quotation.id}`);
}

export async function updateDraftQuotation(quotationId: string, formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = quotationIdSchema.parse({ id: quotationId });
  const existingQuotation = await prisma.quotation.findUnique({
    where: {
      id,
    },
    select: {
      status: true,
    },
  });

  if (!existingQuotation) {
    throw new Error("Quotation was not found.");
  }

  if (existingQuotation.status !== "DRAFT") {
    throw new Error("Only draft quotations can be edited.");
  }

  const input = parseQuotationDraftFormData(formData);
  const currencyCode = await getBusinessCurrencyCode(input.businessProfileId);
  const { lineItems, totals } = calculateDraftQuotationAmounts(input);

  await prisma.$transaction(async (tx) => {
    await tx.quotationLineItem.deleteMany({
      where: {
        quotationId: id,
      },
    });
    await tx.quotation.update({
      where: {
        id,
      },
      data: {
        businessProfileId: input.businessProfileId,
        customerId: input.customerId,
        currencyCode,
        issueDate: parseDate(input.issueDate, "Issue date"),
        expiryDate: input.expiryDate ? parseDate(input.expiryDate, "Expiry date") : null,
        subtotalAmount: totals.subtotalAmount,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        notes: input.notes,
        terms: input.terms,
        lineItems: {
          create: lineItems.map(toLineItemCreateData),
        },
      },
    });
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  redirect(`/quotations/${id}`);
}

export async function finalizeDraftQuotation(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = quotationIdSchema.parse({
    id: formData.get("id"),
  });

  const finalizedQuotation = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: {
        id,
      },
      include: {
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!quotation) {
      throw new Error("Quotation was not found.");
    }

    if (quotation.status !== "DRAFT") {
      throw new Error("Only draft quotations can be finalized.");
    }

    if (quotation.quotationNumber) {
      throw new Error("This quotation already has a quotation number.");
    }

    if (quotation.lineItems.length === 0) {
      throw new Error("Cannot finalize a quotation without line items.");
    }

    const recalculatedLineItems = quotation.lineItems.map((lineItem) => {
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
    const quotationNumber = await getNextDocumentNumberInTransaction(tx, "quotation", quotation.issueDate);

    await Promise.all(
      recalculatedLineItems.map((lineItem) =>
        tx.quotationLineItem.update({
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

    return tx.quotation.update({
      where: {
        id,
      },
      data: {
        quotationNumber,
        status: "FINALIZED",
        finalizedAt: new Date(),
        subtotalAmount: totals.subtotalAmount,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
      },
      select: {
        id: true,
      },
    });
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${finalizedQuotation.id}`);
  redirect(`/quotations/${finalizedQuotation.id}`);
}


export async function convertQuotationToInvoice(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = quotationIdSchema.parse({
    id: formData.get("id"),
  });

  const invoice = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: {
        id,
      },
      include: {
        invoice: {
          select: {
            id: true,
          },
        },
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!quotation) {
      throw new Error("Quotation was not found.");
    }

    if (quotation.status !== "FINALIZED") {
      throw new Error("Only finalized quotations can be converted to invoices.");
    }

    if (!quotation.quotationNumber || !quotation.finalizedAt) {
      throw new Error("Quotation must have an official quotation number before conversion.");
    }

    if (quotation.invoice) {
      throw new Error("This quotation has already been converted to an invoice.");
    }

    if (quotation.lineItems.length === 0) {
      throw new Error("Cannot convert a quotation without line items.");
    }

    const createdInvoice = await tx.invoice.create({
      data: createDraftInvoiceFromQuotationData(quotation),
      select: {
        id: true,
      },
    });

    await tx.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        status: "CONVERTED",
        convertedAt: new Date(),
      },
    });

    return createdInvoice;
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function generateQuotationPdf(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = quotationIdSchema.parse({
    id: formData.get("id"),
  });
  const quotation = await prisma.quotation.findUnique({
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
    },
  });

  if (!quotation) {
    throw new Error("Quotation was not found.");
  }

  if (!quotation.quotationNumber || quotation.status === "DRAFT") {
    throw new Error("Only finalized quotations can be exported to PDF.");
  }

  const template = await prisma.documentTemplate.findFirst({
    where: {
      isDefault: true,
      templateType: "QUOTATION",
    },
    select: {
      sourceType: true,
      htmlContent: true,
      cssContent: true,
      uploadedFileUrl: true,
      fields: true,
    },
  });

  const pdfBytes = await createQuotationPdfBytes({
    quotationNumber: quotation.quotationNumber,
    currencyCode: quotation.currencyCode,
    issueDate: quotation.issueDate,
    expiryDate: quotation.expiryDate,
    subtotalAmount: quotation.subtotalAmount,
    discountAmount: quotation.discountAmount,
    taxAmount: quotation.taxAmount,
    totalAmount: quotation.totalAmount,
    notes: quotation.notes,
    terms: quotation.terms,
    businessProfile: quotation.businessProfile,
    customer: quotation.customer,
    lineItems: quotation.lineItems,
    template,
  });
  const quotationPdfUrl = await uploadDocumentPdf(`quotations/${quotation.id}/${quotation.quotationNumber}.pdf`, pdfBytes);

  await prisma.quotation.update({
    where: {
      id: quotation.id,
    },
    data: {
      quotationPdfUrl,
    },
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotation.id}`);
}

async function uploadDocumentPdf(path: string, pdfBytes: Uint8Array) {
  return uploadGeneratedPdf(path, pdfBytes);
}

export async function deleteDraftQuotation(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = quotationIdSchema.parse({
    id: formData.get("id"),
  });
  const quotation = await prisma.quotation.findUnique({
    where: {
      id,
    },
    select: {
      status: true,
    },
  });

  if (!quotation) {
    return;
  }

  if (quotation.status !== "DRAFT") {
    throw new Error("Only draft quotations can be deleted.");
  }

  await prisma.quotation.delete({
    where: {
      id,
    },
  });

  revalidatePath("/quotations");
  redirect("/quotations");
}

function toLineItemCreateData(lineItem: ReturnType<typeof calculateDraftQuotationAmounts>["lineItems"][number]) {
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
