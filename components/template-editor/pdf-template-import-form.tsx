import { importPdfOverlayTemplate } from "@/lib/templates/actions";

type PdfTemplateImportFormProps = {
  defaultTemplateType?: "invoice" | "quotation";
};

export function PdfTemplateImportForm({ defaultTemplateType = "invoice" }: PdfTemplateImportFormProps) {
  return (
    <form action={importPdfOverlayTemplate} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" encType="multipart/form-data">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">PDF overlay templates use a locked background.</p>
        <p className="mt-1">The uploaded PDF is stored unchanged. Only mapped field positions are editable.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Template name</span>
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400" name="name" required placeholder="Invoice letterhead overlay" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Template type</span>
          <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400" name="templateType" defaultValue={defaultTemplateType}>
            <option value="invoice">Invoice</option>
            <option value="quotation">Quotation</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">PDF file</span>
        <input accept=".pdf,application/pdf" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" name="pdfFile" required type="file" />
      </label>

      <div className="flex justify-end">
        <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
          Upload PDF template
        </button>
      </div>
    </form>
  );
}
