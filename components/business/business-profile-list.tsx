import type { Currency } from "@prisma/client";
import { BusinessProfileForm } from "@/components/business/business-profile-form";
import { deleteBusinessProfile } from "@/lib/business-profiles/actions";

type BusinessProfileListProfile = {
  id: string;
  businessName: string;
  defaultCurrencyCode: string;
  logoFileUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  defaultCurrency: Pick<Currency, "code" | "name" | "symbol">;
  _count: {
    invoices: number;
    quotations: number;
  };
};

type BusinessProfileListProps = {
  currencies: Pick<Currency, "code" | "name" | "symbol">[];
  profiles: BusinessProfileListProfile[];
};

export function BusinessProfileList({ currencies, profiles }: BusinessProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No business profiles yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a profile to store sender details and branding for invoices and quotations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => {
        const isUsed = profile._count.invoices > 0 || profile._count.quotations > 0;

        return (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" key={profile.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {profile.businessName}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {profile.defaultCurrency.code} · {profile.defaultCurrency.symbol}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <Detail label="Email" value={profile.email} />
                  <Detail label="Phone" value={profile.phone} />
                  <Detail label="Tax number" value={profile.taxNumber} />
                  <Detail label="Logo path" value={profile.logoFileUrl} />
                  <Detail label="Address" value={profile.address} />
                  <Detail label="Notes" value={profile.notes} />
                </dl>
                {isUsed ? (
                  <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    This profile is used by {profile._count.invoices} invoices and {profile._count.quotations} quotations, so it cannot be deleted.
                  </p>
                ) : null}
              </div>

              <form action={deleteBusinessProfile}>
                <input name="id" type="hidden" value={profile.id} />
                <button
                  className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isUsed}
                  type="submit"
                >
                  Delete
                </button>
              </form>
            </div>

            <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit profile</summary>
              <div className="mt-5">
                <BusinessProfileForm currencies={currencies} profile={profile} />
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="font-medium text-slate-950">{label}</dt>
      <dd className="mt-1 break-words">{value || "—"}</dd>
    </div>
  );
}
