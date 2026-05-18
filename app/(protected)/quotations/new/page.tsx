import { QuotationForm } from "@/components/quotation/quotation-form";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

export default async function NewQuotationPage() {
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
    <PageShell title="Create draft quotation" description="Draft quotations can be edited freely and do not receive quotation numbers.">
      <QuotationForm businesses={businesses} customers={customers} />
    </PageShell>
  );
}
