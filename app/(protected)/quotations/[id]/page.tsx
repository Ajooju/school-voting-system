import { notFound } from "next/navigation";
import { QuotationDetail } from "@/components/quotation/quotation-detail";
import { prisma } from "@/lib/db/prisma";

type QuotationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      businessProfile: true,
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
    notFound();
  }

  return <QuotationDetail quotation={quotation} />;
}
