import { DocxImportForm } from "@/components/template-editor/docx-import-form";
import { PageShell } from "@/components/ui/page-shell";

export default function ImportDocxTemplatePage() {
  return (
    <PageShell
      title="Import DOCX template"
      description="Upload a DOCX invoice or quotation template, convert it to editable HTML, and clean it up in the visual editor."
    >
      <DocxImportForm />
    </PageShell>
  );
}
