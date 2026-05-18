import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const signedUrlLifetimeSeconds = 60;

type InvoiceDownloadRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: InvoiceDownloadRouteProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    select: {
      invoicePdfUrl: true,
    },
  });

  if (!invoice?.invoicePdfUrl) {
    return new Response("Invoice PDF was not found.", { status: 404 });
  }

  if (invoice.invoicePdfUrl.startsWith("http://") || invoice.invoicePdfUrl.startsWith("https://")) {
    return new Response("Invoice PDF storage path is invalid.", { status: 500 });
  }

  const bucket = process.env.SUPABASE_GENERATED_PDFS_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_GENERATED_PDFS_BUCKET environment variable.");
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUrl(invoice.invoicePdfUrl, signedUrlLifetimeSeconds, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create invoice download URL.");
  }

  redirect(data.signedUrl);
}
