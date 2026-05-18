"use client";

import { generateInvoicePdf } from "@/lib/invoices/actions";

type GenerateInvoicePdfButtonProps = {
  invoiceId: string;
  hasPdf: boolean;
};

export function GenerateInvoicePdfButton({ invoiceId, hasPdf }: GenerateInvoicePdfButtonProps) {
  return (
    <form action={generateInvoicePdf}>
      <input name="id" type="hidden" value={invoiceId} />
      <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="submit">
        {hasPdf ? "Regenerate PDF" : "Generate PDF"}
      </button>
    </form>
  );
}
