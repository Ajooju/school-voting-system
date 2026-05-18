import type { ReactNode } from "react";
import type { PaymentMethod, Prisma } from "@prisma/client";
import Link from "next/link";
import { PaymentList } from "@/components/payment/payment-list";
import { Pagination } from "@/components/ui/pagination";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

const pageSize = 20;
const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"];

type PaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = (await searchParams) ?? {};
  const query = getStringParam(params, "q");
  const paymentMethod = getAllowedParam(params, "paymentMethod", paymentMethods);
  const fromDate = getDateParam(params, "from");
  const toDate = getDateParam(params, "to");
  const currentPage = getPageParam(params);

  const where: Prisma.InvoicePaymentWhereInput = {};

  if (query) {
    where.OR = [
      {
        referenceNumber: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        invoice: {
          invoiceNumber: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        invoice: {
          customer: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod as PaymentMethod;
  }

  if (fromDate || toDate) {
    where.paymentDate = {
      ...(fromDate ? { gte: startOfUtcDay(fromDate) } : {}),
      ...(toDate ? { lte: endOfUtcDay(toDate) } : {}),
    };
  }

  const [payments, totalPayments] = await Promise.all([
    prisma.invoicePayment.findMany({
      where,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: [
        {
          paymentDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        paymentDate: true,
        paymentMethod: true,
        referenceNumber: true,
        receiptNumber: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.invoicePayment.count({ where }),
  ]);

  const normalizedParams = normalizeSearchParams({
    from: fromDate,
    paymentMethod,
    q: query,
    to: toDate,
  });

  return (
    <PageShell title="Payments" description="Search and review invoice payment records.">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-950">Payment records</h2>
        <p className="mt-1 text-sm text-slate-600">
          Filter by invoice, customer, reference, payment method, and payment date range.
        </p>
      </div>

      <PaymentFilters
        fromDate={fromDate}
        paymentMethod={paymentMethod}
        query={query}
        toDate={toDate}
      />

      <div className="mt-6 space-y-4">
        <p className="text-sm text-slate-500">
          Showing {payments.length} of {totalPayments.toLocaleString("en")} matching payments.
        </p>
        <PaymentList payments={payments} />
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          searchParams={normalizedParams}
          totalItems={totalPayments}
        />
      </div>
    </PageShell>
  );
}

function PaymentFilters({
  fromDate,
  paymentMethod,
  query,
  toDate,
}: {
  fromDate: string;
  paymentMethod: string;
  query: string;
  toDate: string;
}) {
  const hasFilters = Boolean(query || paymentMethod || fromDate || toDate);

  return (
    <form action="/payments" className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search</span>
          <input
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            defaultValue={query}
            name="q"
            placeholder="Invoice, customer, or reference"
            type="search"
          />
        </label>

        <FilterSelect label="Method" name="paymentMethod" value={paymentMethod}>
          <option value="">All methods</option>
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {formatFilterLabel(method)}
            </option>
          ))}
        </FilterSelect>

        <DateInput label="From" name="from" value={fromDate} />
        <DateInput label="To" name="to" value={toDate} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          type="submit"
        >
          Apply filters
        </button>
        {hasFilters ? (
          <Link
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            href="/payments"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function DateInput({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={value}
        name={name}
        type="date"
      />
    </label>
  );
}

function FilterSelect({
  children,
  label,
  name,
  value,
}: {
  children: ReactNode;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select
        className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={value}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function getStringParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  return typeof value === "string" ? value.trim() : "";
}

function getAllowedParam(params: Record<string, string | string[] | undefined>, key: string, allowedValues: string[]) {
  const value = getStringParam(params, key);

  return allowedValues.includes(value) ? value : "";
}

function getDateParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = getStringParam(params, key);

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function getPageParam(params: Record<string, string | string[] | undefined>) {
  const page = Number.parseInt(getStringParam(params, "page"), 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizeSearchParams(params: Record<string, string>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
}

function startOfUtcDay(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfUtcDay(date: string) {
  return new Date(`${date}T23:59:59.999Z`);
}

function formatFilterLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}
