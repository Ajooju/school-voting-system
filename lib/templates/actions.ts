"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import mammoth from "mammoth";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultTemplateCss, defaultTemplateHtml } from "@/lib/templates/placeholders";
import { templateFormSchema, templateIdSchema } from "@/lib/validations/template";

async function requireAuthenticatedOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage templates.");
  }
}

function parseTemplateFormData(formData: FormData) {
  const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

  return templateFormSchema.parse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    name: formData.get("name"),
    templateType: formData.get("templateType"),
    htmlContent: formData.get("htmlContent") || defaultTemplateHtml,
    cssContent: formData.get("cssContent") || defaultTemplateCss,
    editorJson: formData.get("editorJson") || "",
    isDefault,
  });
}

function toPrismaTemplateType(templateType: "invoice" | "quotation") {
  return templateType.toUpperCase() as "INVOICE" | "QUOTATION";
}

function parseEditorJson(editorJson: string) {
  if (!editorJson.trim()) {
    return null;
  }

  return JSON.parse(editorJson);
}

const maxDocxSizeBytes = 10 * 1024 * 1024;
const docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function getRequiredDocxFile(formData: FormData) {
  const file = formData.get("docxFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("DOCX file is required.");
  }

  if (file.size > maxDocxSizeBytes) {
    throw new Error("DOCX file must be 10 MB or smaller.");
  }

  const isDocxFile = file.name.toLowerCase().endsWith(".docx") || file.type === docxContentType;

  if (!isDocxFile) {
    throw new Error("Upload a .docx file.");
  }

  return file;
}

function assertZipFileSignature(arrayBuffer: ArrayBuffer, message: string) {
  const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const hasZipHeader = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (!hasZipHeader) {
    throw new Error(message);
  }
}

function assertPdfFileSignature(arrayBuffer: ArrayBuffer) {
  const header = new TextDecoder().decode(new Uint8Array(arrayBuffer.slice(0, 5)));

  if (header !== "%PDF-") {
    throw new Error("Uploaded file is not a valid PDF.");
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "template.docx";
}

async function uploadDocxTemplateFile(file: File, arrayBuffer: ArrayBuffer) {
  const bucket = process.env.SUPABASE_TEMPLATES_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_TEMPLATES_BUCKET environment variable.");
  }

  const path = `template-docx/${Date.now()}-${Math.random().toString(36).slice(2)}/${sanitizeFileName(file.name)}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type || docxContentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`DOCX upload failed: ${error.message}`);
  }

  return path;
}

function wrapImportedDocxHtml(htmlContent: string) {
  return `
<section class="docx-imported-template">
  <div class="docx-import-warning">
    Imported DOCX layout may need cleanup before use.
  </div>
  ${htmlContent}
</section>
`;
}

export async function saveTemplate(formData: FormData) {
  await requireAuthenticatedOwner();

  const input = parseTemplateFormData(formData);
  const templateType = toPrismaTemplateType(input.templateType);
  const editorJson = parseEditorJson(input.editorJson);

  const template = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.documentTemplate.updateMany({
        where: {
          templateType,
        },
        data: {
          isDefault: false,
        },
      });
    }

    if (input.id) {
      return tx.documentTemplate.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          templateType,
          sourceType: "VISUAL",
          htmlContent: input.htmlContent,
          cssContent: input.cssContent,
          editorJson,
          isDefault: input.isDefault,
        },
        select: {
          id: true,
        },
      });
    }

    return tx.documentTemplate.create({
      data: {
        name: input.name,
        templateType,
        sourceType: "VISUAL",
        htmlContent: input.htmlContent,
        cssContent: input.cssContent,
        editorJson,
        isDefault: input.isDefault,
      },
      select: {
        id: true,
      },
    });
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${template.id}/edit`);
  redirect(`/templates/${template.id}/edit`);
}

export async function setDefaultTemplate(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = templateIdSchema.parse({
    id: formData.get("id"),
  });
  const template = await prisma.documentTemplate.findUnique({
    where: {
      id,
    },
    select: {
      templateType: true,
    },
  });

  if (!template) {
    throw new Error("Template was not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentTemplate.updateMany({
      where: {
        templateType: template.templateType,
      },
      data: {
        isDefault: false,
      },
    });
    await tx.documentTemplate.update({
      where: {
        id,
      },
      data: {
        isDefault: true,
      },
    });
  });

  revalidatePath("/templates");
}

export async function importDocxTemplate(formData: FormData) {
  await requireAuthenticatedOwner();

  const name = String(formData.get("name") ?? "").trim();
  const templateTypeInput = templateFormSchema.shape.templateType.parse(formData.get("templateType"));
  const docxFile = getRequiredDocxFile(formData);
  const docxArrayBuffer = await docxFile.arrayBuffer();
  assertZipFileSignature(docxArrayBuffer, "DOCX file is not a valid Office document.");
  const docxBuffer = Buffer.from(docxArrayBuffer);
  const result = await mammoth.convertToHtml({ buffer: docxBuffer });
  const uploadedFileUrl = await uploadDocxTemplateFile(docxFile, docxArrayBuffer);
  const htmlContent = wrapImportedDocxHtml(result.value || "<p>Imported DOCX template</p>");
  const templateType = toPrismaTemplateType(templateTypeInput);

  const template = await prisma.documentTemplate.create({
    data: {
      name: name || docxFile.name.replace(/\.docx$/i, ""),
      templateType,
      sourceType: "DOCX_IMPORT",
      htmlContent,
      cssContent: defaultTemplateCss,
      editorJson: null,
      uploadedFileUrl,
      isDefault: false,
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/templates");
  redirect(`/templates/${template.id}/edit`);
}

const maxPdfSizeBytes = 10 * 1024 * 1024;
const pdfContentType = "application/pdf";

const pdfOverlayFields = [
  { fieldKey: "business.logo", label: "Business logo", fieldType: "IMAGE", xPosition: 48, yPosition: 48, width: 96, height: 72, pageNumber: 1, fontSize: 10 },
  { fieldKey: "business.name", label: "Business name", fieldType: "TEXT", xPosition: 160, yPosition: 54, width: 180, height: 18, pageNumber: 1, fontSize: 12 },
  { fieldKey: "customer.name", label: "Customer name", fieldType: "TEXT", xPosition: 48, yPosition: 160, width: 220, height: 18, pageNumber: 1, fontSize: 10 },
  { fieldKey: "document.number", label: "Document number", fieldType: "TEXT", xPosition: 380, yPosition: 54, width: 160, height: 18, pageNumber: 1, fontSize: 10 },
  { fieldKey: "document.issue_date", label: "Issue date", fieldType: "DATE", xPosition: 380, yPosition: 84, width: 160, height: 18, pageNumber: 1, fontSize: 10 },
  { fieldKey: "document.due_or_expiry_date", label: "Due / expiry date", fieldType: "DATE", xPosition: 380, yPosition: 114, width: 160, height: 18, pageNumber: 1, fontSize: 10 },
  { fieldKey: "line_items_table", label: "Line items table", fieldType: "MULTILINE", xPosition: 48, yPosition: 260, width: 500, height: 180, pageNumber: 1, fontSize: 8 },
  { fieldKey: "document.total", label: "Total", fieldType: "MONEY", xPosition: 380, yPosition: 650, width: 160, height: 18, pageNumber: 1, fontSize: 12 },
  { fieldKey: "document.balance_due", label: "Balance due", fieldType: "MONEY", xPosition: 380, yPosition: 680, width: 160, height: 18, pageNumber: 1, fontSize: 12 },
] as const;

function getRequiredPdfFile(formData: FormData) {
  const file = formData.get("pdfFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("PDF file is required.");
  }

  if (file.size > maxPdfSizeBytes) {
    throw new Error("PDF file must be 10 MB or smaller.");
  }

  const isPdfFile = file.name.toLowerCase().endsWith(".pdf") || file.type === pdfContentType;

  if (!isPdfFile) {
    throw new Error("Upload a PDF file.");
  }

  return file;
}

async function uploadPdfTemplateFile(file: File, arrayBuffer: ArrayBuffer) {
  const bucket = process.env.SUPABASE_TEMPLATES_BUCKET;

  if (!bucket) {
    throw new Error("Missing SUPABASE_TEMPLATES_BUCKET environment variable.");
  }

  const path = `template-pdf/${Date.now()}-${Math.random().toString(36).slice(2)}/${sanitizeFileName(file.name)}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type || pdfContentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`PDF upload failed: ${error.message}`);
  }

  return path;
}

export async function importPdfOverlayTemplate(formData: FormData) {
  await requireAuthenticatedOwner();

  const name = String(formData.get("name") ?? "").trim();
  const templateTypeInput = templateFormSchema.shape.templateType.parse(formData.get("templateType"));
  const pdfFile = getRequiredPdfFile(formData);
  const pdfArrayBuffer = await pdfFile.arrayBuffer();
  assertPdfFileSignature(pdfArrayBuffer);
  const uploadedFileUrl = await uploadPdfTemplateFile(pdfFile, pdfArrayBuffer);
  const templateType = toPrismaTemplateType(templateTypeInput);

  const template = await prisma.documentTemplate.create({
    data: {
      name: name || pdfFile.name.replace(/\.pdf$/i, ""),
      templateType,
      sourceType: "PDF_OVERLAY",
      uploadedFileUrl,
      isDefault: false,
      fields: {
        create: pdfOverlayFields.map((field) => ({
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          xPosition: field.xPosition,
          yPosition: field.yPosition,
          width: field.width,
          height: field.height,
          pageNumber: field.pageNumber,
          fontSize: field.fontSize,
        })),
      },
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/templates");
  redirect(`/templates/${template.id}/edit`);
}

export async function savePdfOverlayFields(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = templateIdSchema.parse({
    id: formData.get("id"),
  });
  const fields = JSON.parse(String(formData.get("fieldsJson") ?? "[]")) as Array<{
    fieldKey: string;
    label: string;
    fieldType: string;
    xPosition: number;
    yPosition: number;
    width: number;
    height: number;
    pageNumber: number;
    fontSize: number;
  }>;

  await prisma.$transaction(async (tx) => {
    for (const field of fields) {
      await tx.templateField.upsert({
        where: {
          templateId_fieldKey: {
            templateId: id,
            fieldKey: field.fieldKey,
          },
        },
        create: {
          templateId: id,
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType as "TEXT" | "NUMBER" | "DATE" | "MONEY" | "IMAGE" | "BOOLEAN" | "MULTILINE",
          xPosition: field.xPosition,
          yPosition: field.yPosition,
          width: field.width,
          height: field.height,
          pageNumber: field.pageNumber,
          fontSize: field.fontSize,
        },
        update: {
          label: field.label,
          fieldType: field.fieldType as "TEXT" | "NUMBER" | "DATE" | "MONEY" | "IMAGE" | "BOOLEAN" | "MULTILINE",
          xPosition: field.xPosition,
          yPosition: field.yPosition,
          width: field.width,
          height: field.height,
          pageNumber: field.pageNumber,
          fontSize: field.fontSize,
        },
      });
    }
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}/edit`);
}
