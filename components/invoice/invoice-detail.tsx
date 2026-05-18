import Link from "next/link";
import { FinalizeInvoiceButton } from "@/components/invoice/finalize-invoice-button";
import { GenerateInvoicePdfButton } from "@/components/invoice/generate-invoice-pdf-button";
import { GenerateReceiptButton } from "@/components/payment/generate-receipt-button";
import { deleteDraftInvoice } from "@/lib/invoices/actions";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";

type InvoiceDetailInvoice = {
  id: string;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  status: string;
  currencyCode: string;
  issueDate: Date;
  dueDate: Date | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  balanceDue: number;
  paidAmount: number;
  notes: string | null;
  terms: string | null;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxNumber: string | null;
  };
  businessProfile: {
    businessName: string;
    logoFileUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    taxNumber: string | null;
  };
  payments: Array<{
    id: string;
    receiptNumber: string | null;
    paymentDate: Date;
    amount: number;
    paymentMethod: string;
    referenceNumber: string | null;
    receiptPdfUrl: string | null;
  }>;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: { toString(): string };
    unitPriceAmount: number;
    discountAmount: number;
    taxRateBps: number;
    taxAmount: number;
    lineTotalAmount: number;
  }>;
};

type InvoiceDetailProps = {
  invoice: InvoiceDetailInvoice;
};

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const isDraft = invoice.status === "DRAFT";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">{invoice.status.toLowerCase()}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {invoice.invoiceNumber ?? "Draft invoice"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {invoice.businessProfile.businessName} → {invoice.customer.name}
              {invoice.customer.email ? ` (${invoice.customer.email})` : ""}
            </p>
          </div>
          {isDraft ? (
            <div className="flex gap-2">
              <Link
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={`/invoices/${invoice.id}/edit`}
              >
                Edit draft
              </Link>
              <FinalizeInvoiceButton invoiceId={invoice.id} />
              <form action={deleteDraftInvoice}>
                <input name="id" type="hidden" value={invoice.id} />
                <button className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">
                  Delete draft
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={`/invoices/${invoice.id}/edit`}
              >
                Edit safe fields
              </Link>
              <GenerateInvoicePdfButton hasPdf={Boolean(invoice.invoicePdfUrl)} invoiceId={invoice.id} />
              {invoice.invoicePdfUrl ? (
                <Link
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  href={`/invoices/${invoice.id}/download`}
                >
                  Download PDF
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-200 p-6 text-sm text-slate-600 sm:grid-cols-2">
          <p><span className="font-medium text-slate-950">Issue date:</span> {formatDate(invoice.issueDate)}</p>
          <p><span className="font-medium text-slate-950">Due date:</span> {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</p>
          <p><span className="font-medium text-slate-950">Notes:</span> {invoice.notes ?? "—"}</p>
          <p><span className="font-medium text-slate-950">Terms:</span> {invoice.terms ?? "—"}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Unit price</th>
                <th className="px-6 py-3">Discount</th>
                <th className="px-6 py-3">Tax</th>
                <th className="px-6 py-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.lineItems.map((lineItem) => (
                <tr key={lineItem.id}>
                  <td className="px-6 py-4 font-medium text-slate-950">{lineItem.description}</td>
                  <td className="px-6 py-4 text-slate-600">{lineItem.quantity.toString()}</td>
                  <td className="px-6 py-4 text-slate-600">{formatMinorUnitsByCurrency(lineItem.unitPriceAmount, invoice.currencyCode)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatMinorUnitsByCurrency(lineItem.discountAmount, invoice.currencyCode)}</td>
                  <td className="px-6 py-4 text-slate-600">{lineItem.taxRateBps / 100}% · {formatMinorUnitsByCurrency(lineItem.taxAmount, invoice.currencyCode)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-950">{formatMinorUnitsByCurrency(lineItem.lineTotalAmount, invoice.currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-sm space-y-2 p-6 text-sm">
          <SummaryRow label="Subtotal" value={formatMinorUnitsByCurrency(invoice.subtotalAmount, invoice.currencyCode)} />
          <SummaryRow label="Discount" value={formatMinorUnitsByCurrency(invoice.discountAmount, invoice.currencyCode)} />
          <SummaryRow label="Tax" value={formatMinorUnitsByCurrency(invoice.taxAmount, invoice.currencyCode)} />
          <SummaryRow label="Total" value={formatMinorUnitsByCurrency(invoice.totalAmount, invoice.currencyCode)} strong />
          <SummaryRow label="Paid" value={formatMinorUnitsByCurrency(invoice.paidAmount, invoice.currencyCode)} />
          <SummaryRow label="Balance due" value={formatMinorUnitsByCurrency(invoice.balanceDue, invoice.currencyCode)} strong />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">Payments and receipts</h2>
          <p className="mt-1 text-sm text-slate-600">Generate fixed receipt PDFs for recorded invoice payments.</p>
        </div>
        {invoice.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Payment date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Receipt</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-slate-600">{formatDate(payment.paymentDate)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-950">{formatMinorUnitsByCurrency(payment.amount, invoice.currencyCode)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatPaymentMethod(payment.paymentMethod)}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.referenceNumber ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.receiptNumber ?? "Not generated"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {payment.receiptPdfUrl ? (
                          <Link
                            className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            href={`/receipts/${payment.id}/download`}
                          >
                            Download Receipt
                          </Link>
                        ) : (
                          <GenerateReceiptButton paymentId={payment.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-slate-600">No payments have been recorded for this invoice yet.</p>
        )}
      </section>
    </div>
  );
}

function SummaryRow({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-600">{label}</span>
      <span className={strong ? "font-bold text-slate-950" : "font-medium text-slate-950"}>{value}</span>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function formatPaymentMethod(method: string) {
  return method
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
