"use client";

import { generateInvoicePaymentReceipt } from "@/lib/payments/actions";

type GenerateReceiptButtonProps = {
  paymentId: string;
};

export function GenerateReceiptButton({ paymentId }: GenerateReceiptButtonProps) {
  return (
    <form
      action={generateInvoicePaymentReceipt}
      onSubmit={(event) => {
        if (!window.confirm("Generate a receipt PDF for this payment? This assigns the official receipt number and cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={paymentId} />
      <button className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700" type="submit">
        Generate Receipt PDF
      </button>
    </form>
  );
}
