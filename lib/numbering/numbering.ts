import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  type DocumentNumberType,
  formatDocumentNumber,
  getDocumentYear,
} from "@/lib/numbering/format";

const prismaDocumentTypes = {
  invoice: "INVOICE",
  quotation: "QUOTATION",
  receipt: "RECEIPT",
} as const satisfies Record<DocumentNumberType, string>;

export async function getNextDocumentNumber(documentType: DocumentNumberType, date: Date) {
  return prisma.$transaction((tx) => getNextDocumentNumberInTransaction(tx, documentType, date));
}

export async function getNextDocumentNumberInTransaction(
  tx: Prisma.TransactionClient,
  documentType: DocumentNumberType,
  date: Date,
) {
  const year = getDocumentYear(date);
  const prismaDocumentType = prismaDocumentTypes[documentType];

  if (!prismaDocumentType) {
    throw new Error("Unsupported document type.");
  }

  const sequence = await tx.documentNumberSequence.upsert({
    where: {
      documentType_year: {
        documentType: prismaDocumentType,
        year,
      },
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      documentType: prismaDocumentType,
      year,
      lastNumber: 1,
    },
    select: {
      lastNumber: true,
    },
  });

  return formatDocumentNumber(documentType, year, sequence.lastNumber);
}
