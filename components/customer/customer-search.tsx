type CustomerSearchProps = {
  query: string;
};

export function CustomerSearch({ query }: CustomerSearchProps) {
  return (
    <form action="/customers" className="flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="customer-search">
        Search customers
      </label>
      <input
        className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        defaultValue={query}
        id="customer-search"
        name="q"
        placeholder="Search by name, email, or phone"
        type="search"
      />
      <div className="flex gap-2">
        <button
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          type="submit"
        >
          Search
        </button>
        {query ? (
          <a
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            href="/customers"
          >
            Clear
          </a>
        ) : null}
      </div>
    </form>
  );
}
