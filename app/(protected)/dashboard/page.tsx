import type { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";

const recentItemLimit = 5;

export default async function DashboardPage() {
  const [
    totalInvoices,
    unpaidInvoices,
    partiallyPaidInvoices,
    paidInvoices,
    outstandingByCurrency,
    recentInvoices,
    recentQuotations,
    recentPayments,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.count({
      where: {
        balanceDue: {
          gt: 0,
        },
        paidAmount: 0,
        status: {
          notIn: ["DRAFT", "CANCELLED"],
        },
      },
    }),
    prisma.invoice.count({
      where: {
        balanceDue: {
          gt: 0,
        },
        paidAmount: {
          gt: 0,
        },
        status: {
          not: "CANCELLED",
        },
      },
    }),
    prisma.invoice.count({
      where: {
        status: "PAID",
      },
    }),
    prisma.invoice.groupBy({
      by: ["currencyCode"],
      where: {
        balanceDue: {
          gt: 0,
        },
        status: {
          notIn: ["DRAFT", "CANCELLED"],
        },
      },
      _sum: {
        balanceDue: true,
      },
      orderBy: {
        currencyCode: "asc",
      },
    }),
    prisma.invoice.findMany({
      take: recentItemLimit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        currencyCode: true,
        issueDate: true,
        balanceDue: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.quotation.findMany({
      take: recentItemLimit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        quotationNumber: true,
        status: true,
        currencyCode: true,
        issueDate: true,
        totalAmount: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.invoicePayment.findMany({
      take: recentItemLimit,
      orderBy: {
        paymentDate: "desc",
      },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        paymentDate: true,
        paymentMethod: true,
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
  ]);

  const summaryCards = [
    { label: "Total invoices", value: totalInvoices.toLocaleString("en") },
    { label: "Unpaid invoices", value: unpaidInvoices.toLocaleString("en") },
    { label: "Partially paid", value: partiallyPaidInvoices.toLocaleString("en") },
    { label: "Paid invoices", value: paidInvoices.toLocaleString("en") },
  ];

  return (
    <PageShell
      title="Dashboard"
      description="A focused snapshot of invoice status, outstanding balances, recent activity, and common next actions."
    >
      <div className="space-y-8">
        <section aria-label="Invoice summary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={card.label}>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <DashboardPanel title="Outstanding balance" description="Open finalized balances by currency.">
            {outstandingByCurrency.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {outstandingByCurrency.map((item) => (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4" key={item.currencyCode}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {item.currencyCode}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {formatMinorUnitsByCurrency(item._sum.balanceDue ?? 0, item.currencyCode)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No outstanding finalized invoice balances." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Quick actions" description="Create the records you use most often.">
            <div className="grid gap-3">
              <QuickAction href="/invoices/new" label="New Invoice" />
              <QuickAction href="/quotations/new" label="New Quotation" />
              <QuickAction href="/customers" label="New Customer" />
              <QuickAction href="/businesses" label="New Business Profile" />
            </div>
          </DashboardPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <DashboardPanel title="Recent invoices" description="Latest invoice records.">
            {recentInvoices.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {recentInvoices.map((invoice) => (
                  <Link className="block py-4 first:pt-0 last:pb-0" href={`/invoices/${invoice.id}`} key={invoice.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{invoice.invoiceNumber ?? "Draft invoice"}</p>
                        <p className="mt-1 text-sm text-slate-600">{invoice.customer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Issued {formatDate(invoice.issueDate)}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={invoice.status} />
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {formatMinorUnitsByCurrency(invoice.balanceDue, invoice.currencyCode)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No invoices yet." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Recent quotations" description="Latest quotation records.">
            {recentQuotations.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {recentQuotations.map((quotation) => (
                  <Link
                    className="block py-4 first:pt-0 last:pb-0"
                    href={`/quotations/${quotation.id}`}
                    key={quotation.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {quotation.quotationNumber ?? "Draft quotation"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{quotation.customer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Issued {formatDate(quotation.issueDate)}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={quotation.status} />
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {formatMinorUnitsByCurrency(quotation.totalAmount, quotation.currencyCode)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No quotations yet." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Recent payments" description="Latest payment records.">
            {recentPayments.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {recentPayments.map((payment) => (
                  <Link
                    className="block py-4 first:pt-0 last:pb-0"
                    href={`/invoices/${payment.invoice.id}`}
                    key={payment.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {payment.receiptNumber ?? payment.invoice.invoiceNumber ?? "Payment"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{payment.invoice.customer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatPaymentMethod(payment.paymentMethod)} · {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                      <p className="text-right text-sm font-semibold text-slate-950">
                        {formatMinorUnitsByCurrency(payment.amount, payment.currencyCode)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No payments yet." />
            )}
          </DashboardPanel>
        </section>
      </div>
    </PageShell>
  );
}

type DashboardPanelProps = {
  children: ReactNode;
  description: string;
  title: string;
};

function DashboardPanel({ children, description, title }: DashboardPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
      href={href}
    >
      {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600">
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      {message}
    </p>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function formatPaymentMethod(method: string) {
  return formatStatus(method).toLowerCase();
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
