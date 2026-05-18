"use client";

import { generateQuotationPdf } from "@/lib/quotations/actions";

type GenerateQuotationPdfButtonProps = {
  quotationId: string;
  hasPdf: boolean;
};

export function GenerateQuotationPdfButton({ quotationId, hasPdf }: GenerateQuotationPdfButtonProps) {
  return (
    <form action={generateQuotationPdf}>
      <input name="id" type="hidden" value={quotationId} />
      <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="submit">
        {hasPdf ? "Regenerate PDF" : "Generate PDF"}
      </button>
    </form>
  );
}
