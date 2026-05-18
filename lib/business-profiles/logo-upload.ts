import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const maxLogoSizeBytes = 2 * 1024 * 1024;
const allowedLogoTypes = new Map([
  ["image/png", "png"],
  ["image/jpg", "jpg"],
  ["image/jpeg", "jpg"],
]);

export async function uploadBusinessLogo(businessProfileId: string, logoFile: File) {
  if (logoFile.size === 0) {
    return null;
  }

  if (logoFile.size > maxLogoSizeBytes) {
    throw new Error("Logo must be 2 MB or smaller.");
  }

  const extension = allowedLogoTypes.get(logoFile.type);

  if (!extension) {
    throw new Error("Logo must be a PNG, JPG, or JPEG file.");
  }

  const bucket = process.env.SUPABASE_BUSINESS_LOGOS_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_BUSINESS_LOGOS_BUCKET environment variable.");
  }

  const path = `business-logos/${businessProfileId}/logo.${extension}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(path, await logoFile.arrayBuffer(), {
    contentType: logoFile.type,
    upsert: true,
  });

  if (error) {
    throw new Error(`Logo upload failed: ${error.message}`);
  }

  return path;
}

export async function removeBusinessLogo(logoFileUrl: string | null) {
  if (!logoFileUrl) {
    return;
  }

  const bucket = process.env.SUPABASE_BUSINESS_LOGOS_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_BUSINESS_LOGOS_BUCKET environment variable.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).remove([logoFileUrl]);

  if (error) {
    throw new Error(`Logo removal failed: ${error.message}`);
  }
}
