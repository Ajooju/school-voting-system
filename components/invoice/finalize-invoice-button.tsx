"use client";

import { finalizeDraftInvoice } from "@/lib/invoices/actions";

type FinalizeInvoiceButtonProps = {
  invoiceId: string;
};

export function FinalizeInvoiceButton({ invoiceId }: FinalizeInvoiceButtonProps) {
  return (
    <form
      action={finalizeDraftInvoice}
      onSubmit={(event) => {
        if (!window.confirm("Finalize this invoice? This will assign the official invoice number and lock invoice totals.")) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={invoiceId} />
      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700" type="submit">
        Finalize invoice
      </button>
    </form>
  );
}
