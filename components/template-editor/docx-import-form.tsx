import { importDocxTemplate } from "@/lib/templates/actions";

type DocxImportFormProps = {
  defaultTemplateType?: "invoice" | "quotation";
};

export function DocxImportForm({ defaultTemplateType = "invoice" }: DocxImportFormProps) {
  return (
    <form action={importDocxTemplate} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" encType="multipart/form-data">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">DOCX import is a starting point.</p>
        <p className="mt-1">Converted layouts are not pixel-perfect and may need cleanup in the visual editor after import.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Template name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            name="name"
            required
            placeholder="Imported invoice template"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Template type</span>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            name="templateType"
            defaultValue={defaultTemplateType}
          >
            <option value="invoice">Invoice</option>
            <option value="quotation">Quotation</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">DOCX file</span>
        <input
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          name="docxFile"
          required
          type="file"
        />
      </label>

      <div className="flex justify-end">
        <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
          Import DOCX template
        </button>
      </div>
    </form>
  );
}
