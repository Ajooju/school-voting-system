import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const signedUrlLifetimeSeconds = 60;

type QuotationDownloadRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: QuotationDownloadRouteProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: {
      id,
    },
    select: {
      quotationPdfUrl: true,
    },
  });

  if (!quotation?.quotationPdfUrl) {
    return new Response("Quotation PDF was not found.", { status: 404 });
  }

  if (quotation.quotationPdfUrl.startsWith("http://") || quotation.quotationPdfUrl.startsWith("https://")) {
    return new Response("Quotation PDF storage path is invalid.", { status: 500 });
  }

  const bucket = process.env.SUPABASE_GENERATED_PDFS_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_GENERATED_PDFS_BUCKET environment variable.");
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUrl(quotation.quotationPdfUrl, signedUrlLifetimeSeconds, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create quotation download URL.");
  }

  redirect(data.signedUrl);
}
