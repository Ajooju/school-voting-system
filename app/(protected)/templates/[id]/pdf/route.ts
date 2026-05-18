import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const signedUrlLifetimeSeconds = 60;

type TemplatePdfRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: TemplatePdfRouteProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const template = await prisma.documentTemplate.findUnique({
    where: {
      id,
    },
    select: {
      uploadedFileUrl: true,
    },
  });

  if (!template?.uploadedFileUrl) {
    return new Response("PDF template file was not found.", { status: 404 });
  }

  const bucket = process.env.SUPABASE_TEMPLATES_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_TEMPLATES_BUCKET environment variable.");
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUrl(template.uploadedFileUrl, signedUrlLifetimeSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create PDF preview URL.");
  }

  redirect(data.signedUrl);
}
