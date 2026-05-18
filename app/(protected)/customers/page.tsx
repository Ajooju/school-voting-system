import type { Prisma } from "@prisma/client";
import { CustomerForm } from "@/components/customer/customer-form";
import { CustomerList } from "@/components/customer/customer-list";
import { CustomerSearch } from "@/components/customer/customer-search";
import { Pagination } from "@/components/ui/pagination";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

const pageSize = 20;

type CustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const query = getStringParam(params ?? {}, "q");
  const currentPage = getPageParam(params ?? {});
  const where: Prisma.CustomerWhereInput = query
    ? {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const [customers, totalCustomers] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            invoices: true,
            quotations: true,
          },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <PageShell
      title="Customers"
      description="Manage basic customer records for invoices and quotations."
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]">
        <section className="space-y-4">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Customer records</h2>
              <p className="mt-1 text-sm text-slate-600">
                Search by name, email, or phone. Delete is only available for unused customers.
              </p>
            </div>
            <CustomerSearch query={query} />
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Showing {customers.length} of {totalCustomers.toLocaleString("en")} matching customers.
            </p>
            <CustomerList customers={customers} />
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              searchParams={normalizeSearchParams({ q: query })}
              totalItems={totalCustomers}
            />
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Create customer</h2>
          <p className="mt-1 text-sm text-slate-600">
            Keep customer details basic for now. Only the name is required.
          </p>
          <div className="mt-6">
            <CustomerForm />
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function getStringParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  return typeof value === "string" ? value.trim() : "";
}

function getPageParam(params: Record<string, string | string[] | undefined>) {
  const page = Number.parseInt(getStringParam(params, "page"), 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizeSearchParams(params: Record<string, string>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
}
