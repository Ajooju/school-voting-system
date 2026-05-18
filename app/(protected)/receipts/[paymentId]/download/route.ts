import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const signedUrlLifetimeSeconds = 60;

type ReceiptDownloadRouteProps = {
  params: Promise<{
    paymentId: string;
  }>;
};

export async function GET(_request: Request, { params }: ReceiptDownloadRouteProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { paymentId } = await params;
  const payment = await prisma.invoicePayment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      receiptPdfUrl: true,
    },
  });

  if (!payment?.receiptPdfUrl) {
    return new Response("Receipt PDF was not found.", { status: 404 });
  }

  if (payment.receiptPdfUrl.startsWith("http://") || payment.receiptPdfUrl.startsWith("https://")) {
    return new Response("Receipt PDF storage path is invalid.", { status: 500 });
  }

  const bucket = process.env.SUPABASE_GENERATED_PDFS_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_GENERATED_PDFS_BUCKET environment variable.");
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUrl(payment.receiptPdfUrl, signedUrlLifetimeSeconds, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create receipt download URL.");
  }

  redirect(data.signedUrl);
}
