import { InvoiceForm } from "@/components/invoice/invoice-form";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

export default async function NewInvoicePage() {
  const [businesses, customers] = await Promise.all([
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

  return (
    <PageShell title="Create draft invoice" description="Draft invoices can be edited freely and do not receive invoice numbers.">
      <InvoiceForm businesses={businesses} customers={customers} />
    </PageShell>
  );
}
