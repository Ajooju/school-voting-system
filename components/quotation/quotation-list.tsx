import Link from "next/link";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";

type QuotationListQuotation = {
  id: string;
  quotationNumber: string | null;
  status: string;
  currencyCode: string;
  issueDate: Date;
  expiryDate: Date | null;
  totalAmount: number;
  customer: {
    name: string;
  };
  businessProfile: {
    businessName: string;
  };
};

type QuotationListProps = {
  quotations: QuotationListQuotation[];
};

export function QuotationList({ quotations }: QuotationListProps) {
  if (quotations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No quotations yet</h2>
        <p className="mt-2 text-sm text-slate-600">Create a draft quotation before issuing an official quote.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-200">
        {quotations.map((quotation) => (
          <Link className="block p-5 transition hover:bg-slate-50" href={`/quotations/${quotation.id}`} key={quotation.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">{quotation.quotationNumber ?? "Draft quotation"}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600">
                    {quotation.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {quotation.customer.name} · {quotation.businessProfile.businessName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Issued {formatDate(quotation.issueDate)}{quotation.expiryDate ? ` · Expires ${formatDate(quotation.expiryDate)}` : ""}
                </p>
              </div>
              <p className="text-lg font-semibold text-slate-950">
                {formatMinorUnitsByCurrency(quotation.totalAmount, quotation.currencyCode)}
              </p>
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
