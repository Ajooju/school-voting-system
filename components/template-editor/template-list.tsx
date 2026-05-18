import Link from "next/link";
import { setDefaultTemplate } from "@/lib/templates/actions";

type TemplateListTemplate = {
  id: string;
  name: string;
  templateType: string;
  sourceType: string;
  isDefault: boolean;
  updatedAt: Date;
};

type TemplateListProps = {
  templates: TemplateListTemplate[];
};

export function TemplateList({ templates }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
        No templates yet. Create an invoice or quotation template to start using the visual editor.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Type</th>
            <th className="px-6 py-3">Source</th>
            <th className="px-6 py-3">Default</th>
            <th className="px-6 py-3">Updated</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {templates.map((template) => (
            <tr key={template.id}>
              <td className="px-6 py-4 font-medium text-slate-950">{template.name}</td>
              <td className="px-6 py-4 text-slate-600">{formatEnum(template.templateType)}</td>
              <td className="px-6 py-4 text-slate-600">{formatEnum(template.sourceType)}</td>
              <td className="px-6 py-4 text-slate-600">{template.isDefault ? "Default" : "—"}</td>
              <td className="px-6 py-4 text-slate-600">{formatDate(template.updatedAt)}</td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  {!template.isDefault ? (
                    <form action={setDefaultTemplate}>
                      <input name="id" type="hidden" value={template.id} />
                      <button className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" type="submit">
                        Set default
                      </button>
                    </form>
                  ) : null}
                  <Link
                    className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    href={`/templates/${template.id}/edit`}
                  >
                    Edit
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
