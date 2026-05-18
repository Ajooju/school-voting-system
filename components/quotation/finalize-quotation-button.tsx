"use client";

import { finalizeDraftQuotation } from "@/lib/quotations/actions";

type FinalizeQuotationButtonProps = {
  quotationId: string;
};

export function FinalizeQuotationButton({ quotationId }: FinalizeQuotationButtonProps) {
  return (
    <form
      action={finalizeDraftQuotation}
      onSubmit={(event) => {
        if (!window.confirm("Finalize this quotation? This will assign the official quotation number and lock it.")) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={quotationId} />
      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700" type="submit">
        Finalize quotation
      </button>
    </form>
  );
}
