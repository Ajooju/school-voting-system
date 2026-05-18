import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function assertInvoiceCanReceivePayment(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      finalizedAt: true,
      invoiceNumber: true,
      status: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice was not found.");
  }

  if (!invoice.invoiceNumber || !invoice.finalizedAt || invoice.status === "DRAFT") {
    throw new Error("Payments cannot be added before an invoice is finalized.");
  }
}
