"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { createCustomer, updateCustomer } from "@/lib/customers/actions";
import {
  customerFormSchema,
  type CustomerFormInput,
  type CustomerFormValues,
} from "@/lib/validations/customer";

type CustomerFormCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
};

type CustomerFormProps = {
  customer?: CustomerFormCustomer;
};

export function CustomerForm({ customer }: CustomerFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(customer);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      taxNumber: customer?.taxNumber ?? "",
      notes: customer?.notes ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = customer ? await updateCustomer(customer.id, values) : await createCustomer(values);

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(result.success ?? (isEditing ? "Customer updated." : "Customer created."));

      if (!isEditing) {
        reset();
      }
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          error={errors.name?.message}
          label="Name"
          registration={register("name")}
          required
        />
        <Field
          error={errors.email?.message}
          label="Email"
          registration={register("email")}
          type="email"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Phone" registration={register("phone")} />
        <Field label="Tax number" registration={register("taxNumber")} />
      </div>

      <TextArea label="Address" registration={register("address")} />
      <TextArea label="Notes" registration={register("notes")} />

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Saving..." : isEditing ? "Save changes" : "Create customer"}
      </button>
    </form>
  );
}

function Field({
  error,
  label,
  registration,
  required,
  type = "text",
}: {
  error?: string;
  label: string;
  registration: UseFormRegisterReturn;
  required?: boolean;
  type?: string;
}) {
  const id = registration.name;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        id={id}
        type={type}
        {...registration}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function TextArea({
  label,
  registration,
}: {
  label: string;
  registration: UseFormRegisterReturn;
}) {
  const id = registration.name;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        id={id}
        {...registration}
      />
    </div>
  );
}
