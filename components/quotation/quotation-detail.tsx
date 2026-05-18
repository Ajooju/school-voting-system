import Link from "next/link";
import { ConvertQuotationButton } from "@/components/quotation/convert-quotation-button";
import { FinalizeQuotationButton } from "@/components/quotation/finalize-quotation-button";
import { GenerateQuotationPdfButton } from "@/components/quotation/generate-quotation-pdf-button";
import { deleteDraftQuotation } from "@/lib/quotations/actions";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";

type QuotationDetailQuotation = {
  id: string;
  quotationNumber: string | null;
  quotationPdfUrl: string | null;
  status: string;
  currencyCode: string;
  issueDate: Date;
  expiryDate: Date | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
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
  invoice: {
    id: string;
  } | null;
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

type QuotationDetailProps = {
  quotation: QuotationDetailQuotation;
};

export function QuotationDetail({ quotation }: QuotationDetailProps) {
  const isDraft = quotation.status === "DRAFT";
  const canConvert = quotation.status === "FINALIZED" && !quotation.invoice;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">{quotation.status.toLowerCase()}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {quotation.quotationNumber ?? "Draft quotation"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {quotation.businessProfile.businessName} → {quotation.customer.name}
              {quotation.customer.email ? ` (${quotation.customer.email})` : ""}
            </p>
          </div>
          {isDraft ? (
            <div className="flex gap-2">
              <Link
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={`/quotations/${quotation.id}/edit`}
              >
                Edit draft
              </Link>
              <FinalizeQuotationButton quotationId={quotation.id} />
              <form action={deleteDraftQuotation}>
                <input name="id" type="hidden" value={quotation.id} />
                <button className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">
                  Delete draft
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {canConvert ? <ConvertQuotationButton quotationId={quotation.id} /> : null}
              {quotation.invoice ? (
                <Link
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  href={`/invoices/${quotation.invoice.id}`}
                >
                  View invoice
                </Link>
              ) : null}
              <GenerateQuotationPdfButton hasPdf={Boolean(quotation.quotationPdfUrl)} quotationId={quotation.id} />
              {quotation.quotationPdfUrl ? (
                <Link
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  href={`/quotations/${quotation.id}/download`}
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
          <p><span className="font-medium text-slate-950">Issue date:</span> {formatDate(quotation.issueDate)}</p>
          <p><span className="font-medium text-slate-950">Expiry date:</span> {quotation.expiryDate ? formatDate(quotation.expiryDate) : "—"}</p>
          <p><span className="font-medium text-slate-950">Notes:</span> {quotation.notes ?? "—"}</p>
          <p><span className="font-medium text-slate-950">Terms:</span> {quotation.terms ?? "—"}</p>
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
              {quotation.lineItems.map((lineItem) => (
                <tr key={lineItem.id}>
                  <td className="px-6 py-4 font-medium text-slate-950">{lineItem.description}</td>
                  <td className="px-6 py-4 text-slate-600">{lineItem.quantity.toString()}</td>
                  <td className="px-6 py-4 text-slate-600">{formatMinorUnitsByCurrency(lineItem.unitPriceAmount, quotation.currencyCode)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatMinorUnitsByCurrency(lineItem.discountAmount, quotation.currencyCode)}</td>
                  <td className="px-6 py-4 text-slate-600">{lineItem.taxRateBps / 100}% · {formatMinorUnitsByCurrency(lineItem.taxAmount, quotation.currencyCode)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-950">{formatMinorUnitsByCurrency(lineItem.lineTotalAmount, quotation.currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-sm space-y-2 p-6 text-sm">
          <SummaryRow label="Subtotal" value={formatMinorUnitsByCurrency(quotation.subtotalAmount, quotation.currencyCode)} />
          <SummaryRow label="Discount" value={formatMinorUnitsByCurrency(quotation.discountAmount, quotation.currencyCode)} />
          <SummaryRow label="Tax" value={formatMinorUnitsByCurrency(quotation.taxAmount, quotation.currencyCode)} />
          <SummaryRow label="Total" value={formatMinorUnitsByCurrency(quotation.totalAmount, quotation.currencyCode)} strong />
        </div>
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
