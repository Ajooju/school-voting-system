import { updateFinalizedInvoiceDetails } from "@/lib/invoices/actions";

type FinalizedInvoiceEditFormProps = {
  invoice: {
    id: string;
    dueDate: Date | null;
    notes: string | null;
    terms: string | null;
  };
};

export function FinalizedInvoiceEditForm({ invoice }: FinalizedInvoiceEditFormProps) {
  return (
    <form action={updateFinalizedInvoiceDetails.bind(null, invoice.id)} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        This invoice is finalized. You can only edit safe non-number fields; invoice number, business, customer, currency, line items, and totals are locked.
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="dueDate">Due date</label>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          defaultValue={invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined}
          id="dueDate"
          name="dueDate"
          type="date"
        />
      </div>
      <TextArea defaultValue={invoice.notes ?? undefined} label="Notes" name="notes" />
      <TextArea defaultValue={invoice.terms ?? undefined} label="Terms" name="terms" />
      <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
        Save safe fields
      </button>
    </form>
  );
}

function TextArea({ defaultValue, label, name }: { defaultValue?: string; label: string; name: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={name}>{label}</label>
      <textarea
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={defaultValue}
        id={name}
        name={name}
      />
    </div>
  );
}
