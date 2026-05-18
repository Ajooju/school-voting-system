import { notFound } from "next/navigation";
import { QuotationForm } from "@/components/quotation/quotation-form";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

type EditQuotationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = await params;
  const [quotation, businesses, customers] = await Promise.all([
    prisma.quotation.findUnique({
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

  if (!quotation || quotation.status !== "DRAFT") {
    notFound();
  }

  return (
    <PageShell title="Edit draft quotation" description="Update draft quotation details and line items before finalization.">
      <QuotationForm businesses={businesses} customers={customers} quotation={quotation} />
    </PageShell>
  );
}
