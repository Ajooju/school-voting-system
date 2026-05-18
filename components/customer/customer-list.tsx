import { CustomerForm } from "@/components/customer/customer-form";
import { deleteCustomer } from "@/lib/customers/actions";

type CustomerListCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    invoices: number;
    quotations: number;
  };
};

type CustomerListProps = {
  customers: CustomerListCustomer[];
};

export function CustomerList({ customers }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">No customers found</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a customer or adjust your search to see matching records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => {
        const isUsed = customer._count.invoices > 0 || customer._count.quotations > 0;

        return (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" key={customer.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">{customer.name}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Customer
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <Detail label="Email" value={customer.email} />
                  <Detail label="Phone" value={customer.phone} />
                  <Detail label="Tax number" value={customer.taxNumber} />
                  <Detail label="Address" value={customer.address} />
                  <Detail label="Notes" value={customer.notes} />
                </dl>
                {isUsed ? (
                  <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    This customer is used by {customer._count.invoices} invoices and {customer._count.quotations} quotations, so it cannot be deleted.
                  </p>
                ) : null}
              </div>

              <form action={deleteCustomer}>
                <input name="id" type="hidden" value={customer.id} />
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
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit customer</summary>
              <div className="mt-5">
                <CustomerForm customer={customer} />
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
