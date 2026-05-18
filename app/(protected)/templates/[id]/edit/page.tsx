import { notFound } from "next/navigation";
import { PdfOverlayEditor } from "@/components/template-editor/pdf-overlay-editor";
import { TemplateEditorForm } from "@/components/template-editor/template-editor-form";
import { prisma } from "@/lib/db/prisma";
import { PageShell } from "@/components/ui/page-shell";

type EditTemplatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;
  const template = await prisma.documentTemplate.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      templateType: true,
      htmlContent: true,
      cssContent: true,
      editorJson: true,
      isDefault: true,
      sourceType: true,
      uploadedFileUrl: true,
      fields: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!template) {
    notFound();
  }

  if (template.sourceType === "PDF_OVERLAY") {
    if (!template.uploadedFileUrl) {
      notFound();
    }

    return (
      <PageShell
        title="Map PDF overlay fields"
        description="Use the uploaded PDF as a locked background and position editable fields on top of it."
      >
        <PdfOverlayEditor
          fields={template.fields.map((field) => ({
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            xPosition: field.xPosition ? Number(field.xPosition) : null,
            yPosition: field.yPosition ? Number(field.yPosition) : null,
            width: field.width ? Number(field.width) : null,
            height: field.height ? Number(field.height) : null,
            pageNumber: field.pageNumber,
            fontSize: field.fontSize ? Number(field.fontSize) : null,
          }))}
          pdfPreviewUrl={`/templates/${template.id}/pdf`}
          templateId={template.id}
          uploadedFileUrl={template.uploadedFileUrl}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Edit template"
      description="Update the template layout, placeholders, saved HTML, CSS, and editor project JSON."
    >
      <TemplateEditorForm template={template} />
    </PageShell>
  );
}
