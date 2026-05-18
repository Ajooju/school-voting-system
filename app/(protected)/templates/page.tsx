import Link from "next/link";
import { TemplateList } from "@/components/template-editor/template-list";
import { prisma } from "@/lib/db/prisma";
import { PageShell } from "@/components/ui/page-shell";

export default async function TemplatesPage() {
  const templates = await prisma.documentTemplate.findMany({
    orderBy: [
      {
        templateType: "asc",
      },
      {
        isDefault: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      id: true,
      name: true,
      templateType: true,
      sourceType: true,
      isDefault: true,
      updatedAt: true,
    },
  });

  return (
    <PageShell
      title="Templates"
      description="Create and manage visual invoice and quotation templates with GrapesJS."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Template records</h2>
          <p className="mt-1 text-sm text-slate-600">Default templates are used first for their document type when PDF rendering is connected.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/templates/import-pdf"
          >
            Import PDF
          </Link>
          <Link
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/templates/import-docx"
          >
            Import DOCX
          </Link>
          <Link
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/templates/new"
          >
            Create template
          </Link>
        </div>
      </div>
      <TemplateList templates={templates} />
    </PageShell>
  );
}
