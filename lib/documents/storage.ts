import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const maxGeneratedPdfSizeBytes = 15 * 1024 * 1024;

export async function uploadGeneratedPdf(path: string, pdfBytes: Uint8Array) {
  assertSafeStoragePath(path);
  assertGeneratedPdfBytes(pdfBytes);

  const bucket = process.env.SUPABASE_GENERATED_PDFS_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_GENERATED_PDFS_BUCKET environment variable.");
  }

  const pdfArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(path, pdfArrayBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    throw new Error(`PDF upload failed: ${error.message}`);
  }

  return path;
}

function assertGeneratedPdfBytes(pdfBytes: Uint8Array) {
  if (pdfBytes.byteLength === 0) {
    throw new Error("Generated PDF is empty.");
  }

  if (pdfBytes.byteLength > maxGeneratedPdfSizeBytes) {
    throw new Error("Generated PDF is too large to upload safely.");
  }

  const header = new TextDecoder().decode(pdfBytes.slice(0, 5));

  if (header !== "%PDF-") {
    throw new Error("Generated file is not a valid PDF.");
  }
}

function assertSafeStoragePath(path: string) {
  if (!/^[a-z0-9][a-z0-9._/-]*\.pdf$/i.test(path) || path.includes("..") || path.includes("//")) {
    throw new Error("Generated PDF storage path is invalid.");
  }
}
