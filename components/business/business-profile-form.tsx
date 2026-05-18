import type { Currency } from "@prisma/client";
import { createBusinessProfile, updateBusinessProfile } from "@/lib/business-profiles/actions";

type BusinessProfileFormProfile = {
  id: string;
  businessName: string;
  defaultCurrencyCode: string;
  logoFileUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  notes: string | null;
};

type BusinessProfileFormProps = {
  currencies: Pick<Currency, "code" | "name" | "symbol">[];
  profile?: BusinessProfileFormProfile;
};

export function BusinessProfileForm({ currencies, profile }: BusinessProfileFormProps) {
  const isEditing = Boolean(profile);

  return (
    <form
      action={isEditing ? updateBusinessProfile : createBusinessProfile}
      className="space-y-5"
      encType="multipart/form-data"
    >
      {profile ? <input name="id" type="hidden" value={profile.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          defaultValue={profile?.businessName}
          inputId={fieldId("businessName", profile?.id)}
          label="Business name"
          name="businessName"
          required
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={fieldId("defaultCurrencyCode", profile?.id)}>
            Default currency
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            defaultValue={profile?.defaultCurrencyCode ?? ""}
            id={fieldId("defaultCurrencyCode", profile?.id)}
            name="defaultCurrencyCode"
            required
          >
            <option value="" disabled>
              Select a currency
            </option>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.name} ({currency.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          defaultValue={profile?.email ?? undefined}
          inputId={fieldId("email", profile?.id)}
          label="Email"
          name="email"
          type="email"
        />
        <Field
          defaultValue={profile?.phone ?? undefined}
          inputId={fieldId("phone", profile?.id)}
          label="Phone"
          name="phone"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          defaultValue={profile?.taxNumber ?? undefined}
          inputId={fieldId("taxNumber", profile?.id)}
          label="Tax number"
          name="taxNumber"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor={fieldId("logo", profile?.id)}>
            Logo
          </label>
          <input
            accept="image/png,image/jpg,image/jpeg,image/svg+xml"
            className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            id={fieldId("logo", profile?.id)}
            name="logo"
            type="file"
          />
          <p className="text-xs text-slate-500">PNG, JPG, JPEG, or SVG up to 2 MB.</p>
          {profile?.logoFileUrl ? (
            <p className="break-all text-xs text-slate-500">Current logo: {profile.logoFileUrl}</p>
          ) : null}
        </div>
      </div>

      <TextArea
        defaultValue={profile?.address ?? undefined}
        inputId={fieldId("address", profile?.id)}
        label="Address"
        name="address"
      />
      <TextArea
        defaultValue={profile?.notes ?? undefined}
        inputId={fieldId("notes", profile?.id)}
        label="Notes"
        name="notes"
      />

      <button
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        type="submit"
      >
        {isEditing ? "Save changes" : "Create business profile"}
      </button>
    </form>
  );
}

function Field({
  defaultValue,
  inputId,
  label,
  name,
  required,
  type = "text",
}: {
  defaultValue?: string;
  inputId: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={defaultValue}
        id={inputId}
        name={name}
        required={required}
        type={type}
      />
    </div>
  );
}

function TextArea({
  defaultValue,
  inputId,
  label,
  name,
}: {
  defaultValue?: string;
  inputId: string;
  label: string;
  name: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={defaultValue}
        id={inputId}
        name={name}
      />
    </div>
  );
}

function fieldId(name: string, profileId?: string) {
  return profileId ? `${name}-${profileId}` : name;
}
