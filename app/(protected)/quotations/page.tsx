import type { ReactNode } from "react";
import type { Prisma, QuotationStatus } from "@prisma/client";
import Link from "next/link";
import { QuotationList } from "@/components/quotation/quotation-list";
import { Pagination } from "@/components/ui/pagination";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

const pageSize = 20;
const quotationStatuses = ["DRAFT", "FINALIZED", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"];
const sortOptions = [
  { label: "Issue date: newest", value: "issueDateDesc" },
  { label: "Issue date: oldest", value: "issueDateAsc" },
];

type ListPageSearchParams = Promise<Record<string, string | string[] | undefined>>;

type QuotationsPageProps = {
  searchParams?: ListPageSearchParams;
};

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const params = (await searchParams) ?? {};
  const query = getStringParam(params, "q");
  const status = getAllowedParam(params, "status", quotationStatuses);
  const businessProfileId = getStringParam(params, "businessProfileId");
  const currencyCode = getStringParam(params, "currencyCode").toUpperCase();
  const sort = getAllowedParam(
    params,
    "sort",
    sortOptions.map((option) => option.value),
  ) || "issueDateDesc";
  const currentPage = getPageParam(params);

  const where: Prisma.QuotationWhereInput = {};

  if (query) {
    where.OR = [
      {
        quotationNumber: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        customer: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (status) {
    where.status = status as QuotationStatus;
  }

  if (businessProfileId) {
    where.businessProfileId = businessProfileId;
  }

  if (currencyCode) {
    where.currencyCode = currencyCode;
  }

  const orderDirection = sort === "issueDateAsc" ? "asc" : "desc";

  const [quotations, totalQuotations, businessProfiles, currencies] = await Promise.all([
    prisma.quotation.findMany({
      where,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: [
        {
          issueDate: orderDirection,
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        businessProfile: {
          select: {
            businessName: true,
          },
        },
      },
    }),
    prisma.quotation.count({ where }),
    prisma.businessProfile.findMany({
      orderBy: {
        businessName: "asc",
      },
      select: {
        id: true,
        businessName: true,
      },
    }),
    prisma.currency.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        code: "asc",
      },
      select: {
        code: true,
      },
    }),
  ]);

  const normalizedParams = normalizeSearchParams({
    businessProfileId,
    currencyCode,
    q: query,
    sort,
    status,
  });

  return (
    <PageShell title="Quotations" description="Create, edit, and review draft quotations before finalization.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Quotation records</h2>
          <p className="mt-1 text-sm text-slate-600">
            Search, filter, and sort quotations without consuming official numbers for drafts.
          </p>
        </div>
        <Link
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/quotations/new"
        >
          Create draft quotation
        </Link>
      </div>

      <QuotationFilters
        businessProfileId={businessProfileId}
        businessProfiles={businessProfiles}
        currencies={currencies}
        currencyCode={currencyCode}
        query={query}
        sort={sort}
        status={status}
      />

      <div className="mt-6 space-y-4">
        <p className="text-sm text-slate-500">
          Showing {quotations.length} of {totalQuotations.toLocaleString("en")} matching quotations.
        </p>
        <QuotationList quotations={quotations} />
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          searchParams={normalizedParams}
          totalItems={totalQuotations}
        />
      </div>
    </PageShell>
  );
}

function QuotationFilters({
  businessProfileId,
  businessProfiles,
  currencies,
  currencyCode,
  query,
  sort,
  status,
}: {
  businessProfileId: string;
  businessProfiles: { id: string; businessName: string }[];
  currencies: { code: string }[];
  currencyCode: string;
  query: string;
  sort: string;
  status: string;
}) {
  const hasFilters = Boolean(query || status || businessProfileId || currencyCode || sort !== "issueDateDesc");

  return (
    <form action="/quotations" className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search</span>
          <input
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            defaultValue={query}
            name="q"
            placeholder="Quotation number or customer"
            type="search"
          />
        </label>

        <FilterSelect label="Status" name="status" value={status}>
          <option value="">All statuses</option>
          {quotationStatuses.map((quotationStatus) => (
            <option key={quotationStatus} value={quotationStatus}>
              {formatFilterLabel(quotationStatus)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Business" name="businessProfileId" value={businessProfileId}>
          <option value="">All businesses</option>
          {businessProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.businessName}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Currency" name="currencyCode" value={currencyCode}>
          <option value="">All currencies</option>
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Sort" name="sort" value={sort}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
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
            href="/quotations"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
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

function getPageParam(params: Record<string, string | string[] | undefined>) {
  const page = Number.parseInt(getStringParam(params, "page"), 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizeSearchParams(params: Record<string, string>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
}

function formatFilterLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}
