import Link from "next/link";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";

type PaymentListPayment = {
  id: string;
  amount: number;
  currencyCode: string;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber: string | null;
  receiptNumber: string | null;
  invoice: {
    id: string;
    invoiceNumber: string | null;
    customer: {
      name: string;
    };
  };
};

type PaymentListProps = {
  payments: PaymentListPayment[];
};

export function PaymentList({ payments }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No payments found</h2>
        <p className="mt-2 text-sm text-slate-600">Adjust your filters or add a payment to an invoice.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-200">
        {payments.map((payment) => (
          <Link className="block p-5 transition hover:bg-slate-50" href={`/invoices/${payment.invoice.id}`} key={payment.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {payment.receiptNumber ?? payment.referenceNumber ?? "Payment"}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600">
                    {formatPaymentMethod(payment.paymentMethod)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {payment.invoice.customer.name} · {payment.invoice.invoiceNumber ?? "Draft invoice"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Paid {formatDate(payment.paymentDate)}{payment.referenceNumber ? ` · Ref ${payment.referenceNumber}` : ""}
                </p>
              </div>
              <p className="text-lg font-semibold text-slate-950">
                {formatMinorUnitsByCurrency(payment.amount, payment.currencyCode)}
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

function formatPaymentMethod(method: string) {
  return method.replace(/_/g, " ").toLowerCase();
}
