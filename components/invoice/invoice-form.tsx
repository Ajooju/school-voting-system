"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { createDraftInvoice, updateDraftInvoice } from "@/lib/invoices/actions";
import {
  calculateLineTotals,
  formatMinorUnitsByCurrency,
  parseDisplayAmountToMinorUnits,
} from "@/lib/money/money";

type BusinessOption = {
  id: string;
  businessName: string;
  defaultCurrencyCode: string;
};

type CustomerOption = {
  id: string;
  name: string;
};

type InvoiceFormLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateBps: string;
};

type InvoiceFormInvoice = {
  id: string;
  businessProfileId: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date | null;
  notes: string | null;
  terms: string | null;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: { toString(): string };
    unitPriceAmount: number;
    discountAmount: number;
    taxRateBps: number;
  }>;
};

type InvoiceFormProps = {
  businesses: BusinessOption[];
  customers: CustomerOption[];
  invoice?: InvoiceFormInvoice;
};

export function InvoiceForm({ businesses, customers, invoice }: InvoiceFormProps) {
  const isEditing = Boolean(invoice);
  const [selectedBusinessId, setSelectedBusinessId] = useState(invoice?.businessProfileId ?? businesses[0]?.id ?? "");
  const [lineItems, setLineItems] = useState<InvoiceFormLineItem[]>(() =>
    invoice?.lineItems.length
      ? invoice.lineItems.map((lineItem) => ({
          id: lineItem.id,
          description: lineItem.description,
          quantity: lineItem.quantity.toString(),
          unitPrice: minorUnitsToDisplay(lineItem.unitPriceAmount),
          discount: minorUnitsToDisplay(lineItem.discountAmount),
          taxRateBps: String(lineItem.taxRateBps),
        }))
      : [createEmptyLineItem()],
  );
  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const currencyCode = selectedBusiness?.defaultCurrencyCode ?? "USD";
  const action = invoice ? updateDraftInvoice.bind(null, invoice.id) : createDraftInvoice;
  const previewTotals = useMemo(() => calculatePreviewTotals(lineItems, currencyCode), [lineItems, currencyCode]);

  function updateLineItem(id: string, field: keyof Omit<InvoiceFormLineItem, "id">, value: string) {
    setLineItems((currentLineItems) =>
      currentLineItems.map((lineItem) => (lineItem.id === id ? { ...lineItem, [field]: value } : lineItem)),
    );
  }

  function addLineItem() {
    setLineItems((currentLineItems) => [...currentLineItems, createEmptyLineItem()]);
  }

  function removeLineItem(id: string) {
    setLineItems((currentLineItems) =>
      currentLineItems.length > 1 ? currentLineItems.filter((lineItem) => lineItem.id !== id) : currentLineItems,
    );
  }

  return (
    <form action={action} className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="businessProfileId">
              Business profile
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              id="businessProfileId"
              name="businessProfileId"
              onChange={(event) => setSelectedBusinessId(event.target.value)}
              required
              value={selectedBusinessId}
            >
              <option value="" disabled>
                Select a business
              </option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.businessName}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Currency: {currencyCode}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="customerId">
              Customer
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              defaultValue={invoice?.customerId ?? ""}
              id="customerId"
              name="customerId"
              required
            >
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <Field defaultValue={formatDateForInput(invoice?.issueDate) ?? todayInputValue()} label="Issue date" name="issueDate" required type="date" />
          <Field defaultValue={formatDateForInput(invoice?.dueDate)} label="Due date" name="dueDate" type="date" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextArea defaultValue={invoice?.notes ?? undefined} label="Notes" name="notes" />
          <TextArea defaultValue={invoice?.terms ?? undefined} label="Terms" name="terms" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Line items</h2>
            <p className="mt-1 text-sm text-slate-600">Draft totals are recalculated again on the server when saved.</p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={addLineItem}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add line
          </button>
        </div>

        <div className="space-y-4">
          {lineItems.map((lineItem, index) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={lineItem.id}>
              <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_7rem_8rem_8rem_7rem_8rem_auto] lg:items-end">
                <Field
                  label="Description"
                  name="description"
                  onChange={(value) => updateLineItem(lineItem.id, "description", value)}
                  required
                  value={lineItem.description}
                />
                <Field
                  label="Quantity"
                  name="quantity"
                  onChange={(value) => updateLineItem(lineItem.id, "quantity", value)}
                  required
                  value={lineItem.quantity}
                />
                <Field
                  label="Unit price"
                  name="unitPrice"
                  onChange={(value) => updateLineItem(lineItem.id, "unitPrice", value)}
                  required
                  value={lineItem.unitPrice}
                />
                <Field
                  label="Discount"
                  name="discount"
                  onChange={(value) => updateLineItem(lineItem.id, "discount", value)}
                  value={lineItem.discount}
                />
                <Field
                  label="Tax bps"
                  name="taxRateBps"
                  onChange={(value) => updateLineItem(lineItem.id, "taxRateBps", value)}
                  value={lineItem.taxRateBps}
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Line total</p>
                  <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-950">
                    {previewTotals.lineTotals[index] ?? formatMinorUnitsByCurrency(0, currencyCode)}
                  </p>
                </div>
                <button
                  aria-label="Remove line item"
                  className="rounded-2xl border border-red-200 p-3 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={lineItems.length === 1}
                  onClick={() => removeLineItem(lineItem.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <Total label="Subtotal" value={previewTotals.subtotal} />
          <Total label="Discount" value={previewTotals.discount} />
          <Total label="Tax" value={previewTotals.tax} />
          <Total label="Total" value={previewTotals.total} strong />
        </div>
        <button className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100" type="submit">
          {isEditing ? "Save draft invoice" : "Create draft invoice"}
        </button>
      </section>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name,
  onChange,
  required,
  type = "text",
  value,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={inputId}>{label}</label>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={defaultValue}
        id={inputId}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        required={required}
        type={type}
        value={value}
      />
    </div>
  );
}

function TextArea({ defaultValue, label, name }: { defaultValue?: string; label: string; name: string }) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={inputId}>{label}</label>
      <textarea
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={defaultValue}
        id={inputId}
        name={name}
      />
    </div>
  );
}

function Total({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={strong ? "mt-1 text-lg font-bold" : "mt-1 font-semibold"}>{value}</p>
    </div>
  );
}

function createEmptyLineItem(): InvoiceFormLineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    discount: "0.00",
    taxRateBps: "0",
  };
}

function calculatePreviewTotals(lineItems: InvoiceFormLineItem[], currencyCode: string) {
  const totals = lineItems.reduce(
    (currentTotals, lineItem) => {
      try {
        const lineTotals = calculateLineTotals({
          quantity: lineItem.quantity || "0",
          unitPriceAmount: parseDisplayAmountToMinorUnits(lineItem.unitPrice || "0"),
          discountAmount: parseDisplayAmountToMinorUnits(lineItem.discount || "0"),
          taxRateBps: Number.parseInt(lineItem.taxRateBps || "0", 10),
        });

        return {
          subtotal: currentTotals.subtotal + lineTotals.subtotalAmount,
          discount: currentTotals.discount + lineTotals.discountAmount,
          tax: currentTotals.tax + lineTotals.taxAmount,
          total: currentTotals.total + lineTotals.lineTotalAmount,
          lineTotals: [...currentTotals.lineTotals, formatMinorUnitsByCurrency(lineTotals.lineTotalAmount, currencyCode)],
        };
      } catch {
        return {
          ...currentTotals,
          lineTotals: [...currentTotals.lineTotals, "—"],
        };
      }
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0, lineTotals: [] as string[] },
  );

  return {
    subtotal: formatMinorUnitsByCurrency(totals.subtotal, currencyCode),
    discount: formatMinorUnitsByCurrency(totals.discount, currencyCode),
    tax: formatMinorUnitsByCurrency(totals.tax, currencyCode),
    total: formatMinorUnitsByCurrency(totals.total, currencyCode),
    lineTotals: totals.lineTotals,
  };
}

function formatDateForInput(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function minorUnitsToDisplay(amountMinor: number) {
  const sign = amountMinor < 0 ? "-" : "";
  const absolute = String(Math.abs(amountMinor)).padStart(3, "0");

  return `${sign}${absolute.slice(0, -2)}.${absolute.slice(-2)}`;
}
