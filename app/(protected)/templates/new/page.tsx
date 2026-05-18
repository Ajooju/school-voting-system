import { TemplateEditorForm } from "@/components/template-editor/template-editor-form";
import { PageShell } from "@/components/ui/page-shell";

export default function NewTemplatePage() {
  return (
    <PageShell
      title="Create template"
      description="Design a built-in visual invoice or quotation template with reusable placeholders."
    >
      <TemplateEditorForm />
    </PageShell>
  );
}
