import { notFound } from "next/navigation";
import { InvoiceDetail } from "@/components/invoice/invoice-detail";
import { prisma } from "@/lib/db/prisma";

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      businessProfile: true,
      lineItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      payments: {
        orderBy: {
          paymentDate: "desc",
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetail invoice={invoice} />;
}
