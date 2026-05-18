"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        type="submit"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Logout
      </button>
    </form>
  );
}
