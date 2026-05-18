import { BusinessProfileForm } from "@/components/business/business-profile-form";
import { BusinessProfileList } from "@/components/business/business-profile-list";
import { PageShell } from "@/components/ui/page-shell";
import { prisma } from "@/lib/db/prisma";

export default async function BusinessesPage() {
  const [currencies, businessProfiles] = await Promise.all([
    prisma.currency.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        code: "asc",
      },
      select: {
        code: true,
        name: true,
        symbol: true,
      },
    }),
    prisma.businessProfile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        defaultCurrency: {
          select: {
            code: true,
            name: true,
            symbol: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            quotations: true,
          },
        },
      },
    }),
  ]);

  return (
    <PageShell
      title="Businesses"
      description="Manage sender profiles, default currencies, contact details, tax information, notes, and invoice branding."
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Business profiles</h2>
            <p className="mt-1 text-sm text-slate-600">
              Delete is only available for profiles that are not used by invoices or quotations.
            </p>
          </div>
          <BusinessProfileList currencies={currencies} profiles={businessProfiles} />
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Create profile</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add the business details that appear on official documents.
          </p>
          <div className="mt-6">
            <BusinessProfileForm currencies={currencies} />
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
