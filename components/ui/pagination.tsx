import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string>;
  totalItems: number;
};

export function Pagination({ currentPage, pageSize, searchParams, totalItems }: PaginationProps) {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Page <span className="font-semibold text-slate-950">{currentPage}</span> of{" "}
        <span className="font-semibold text-slate-950">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <PaginationLink
          disabled={currentPage <= 1}
          href={createPageHref(searchParams, currentPage - 1)}
          label="Previous"
        />
        <PaginationLink
          disabled={currentPage >= totalPages}
          href={createPageHref(searchParams, currentPage + 1)}
          label="Next"
        />
      </div>
    </nav>
  );
}

function PaginationLink({ disabled, href, label }: { disabled: boolean; href: string; label: string }) {
  if (disabled) {
    return (
      <span className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-300">
        {label}
      </span>
    );
  }

  return (
    <Link
      className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
      href={href}
    >
      {label}
    </Link>
  );
}

function createPageHref(searchParams: Record<string, string>, page: number) {
  const params = new URLSearchParams(searchParams);

  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `?${query}` : "?";
}
