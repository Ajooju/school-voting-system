import { PdfTemplateImportForm } from "@/components/template-editor/pdf-template-import-form";
import { PageShell } from "@/components/ui/page-shell";

export default function ImportPdfTemplatePage() {
  return (
    <PageShell
      title="Import PDF overlay template"
      description="Upload a PDF as a locked invoice or quotation background, then map editable fields on top of it."
    >
      <PdfTemplateImportForm />
    </PageShell>
  );
}
