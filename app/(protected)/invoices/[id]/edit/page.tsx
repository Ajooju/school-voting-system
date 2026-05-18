import { notFound } from "next/navigation";
import { FinalizedInvoiceEditForm } from "@/components/invoice/finalized-invoice-edit-form";
import { InvoiceForm } from "@/components/invoice/invoice-form";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

type EditInvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  const [invoice, businesses, customers] = await Promise.all([
    prisma.invoice.findUnique({
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
    }),
    prisma.businessProfile.findMany({
      orderBy: {
        businessName: "asc",
      },
      select: {
        id: true,
        businessName: true,
        defaultCurrencyCode: true,
      },
    }),
    prisma.customer.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (!invoice) {
    notFound();
  }

  if (invoice.status === "DRAFT") {
    return (
      <PageShell title="Edit draft invoice" description="Update draft invoice details and line items before finalization.">
        <InvoiceForm businesses={businesses} customers={customers} invoice={invoice} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Edit finalized invoice"
      description="Only safe non-number fields can be changed after finalization."
    >
      <FinalizedInvoiceEditForm invoice={invoice} />
    </PageShell>
  );
}
