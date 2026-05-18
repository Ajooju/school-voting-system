"use client";

import { convertQuotationToInvoice } from "@/lib/quotations/actions";

type ConvertQuotationButtonProps = {
  quotationId: string;
};

export function ConvertQuotationButton({ quotationId }: ConvertQuotationButtonProps) {
  return (
    <form
      action={convertQuotationToInvoice}
      onSubmit={(event) => {
        if (!window.confirm("Convert this finalized quotation to a draft invoice?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={quotationId} />
      <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
        Convert to Invoice
      </button>
    </form>
  );
}
