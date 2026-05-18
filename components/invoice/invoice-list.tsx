import Link from "next/link";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";

type InvoiceListInvoice = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  currencyCode: string;
  issueDate: Date;
  dueDate: Date | null;
  totalAmount: number;
  balanceDue: number;
  customer: {
    name: string;
  };
  businessProfile: {
    businessName: string;
  };
};

type InvoiceListProps = {
  invoices: InvoiceListInvoice[];
};

export function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No invoices yet</h2>
        <p className="mt-2 text-sm text-slate-600">Create a draft invoice to start adding billable line items.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-200">
        {invoices.map((invoice) => (
          <Link className="block p-5 transition hover:bg-slate-50" href={`/invoices/${invoice.id}`} key={invoice.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">{invoice.invoiceNumber ?? "Draft invoice"}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600">
                    {invoice.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {invoice.customer.name} · {invoice.businessProfile.businessName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Issued {formatDate(invoice.issueDate)}{invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
                </p>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-lg font-semibold text-slate-950">
                  {formatMinorUnitsByCurrency(invoice.totalAmount, invoice.currencyCode)}
                </p>
                <p className="text-sm text-slate-500">
                  Balance {formatMinorUnitsByCurrency(invoice.balanceDue, invoice.currencyCode)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
