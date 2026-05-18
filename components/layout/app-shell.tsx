"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  Home,
  Menu,
  ReceiptText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "@/components/layout/logout-button";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/quotations", label: "Quotations", icon: ReceiptText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/businesses", label: "Businesses", icon: Building2 },
  { href: "/templates", label: "Templates", icon: ReceiptText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentItem = navigationItems.find((item) => isActiveRoute(pathname, item.href));

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white px-4 py-6 lg:flex lg:flex-col">
        <SidebarContent pathname={pathname} />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          />
          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col border-r border-slate-200 bg-white px-4 py-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <AppLogo />
              <button
                aria-label="Close navigation menu"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <SidebarNavigation onNavigate={() => setIsMobileMenuOpen(false)} pathname={pathname} />
            <div className="mt-auto pt-6">
              <LogoutButton />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation menu"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
                type="button"
              >
                <Menu aria-hidden="true" className="size-5" />
              </button>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Personal Invoicing
                </p>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {currentItem?.label ?? "Workspace"}
                </h1>
              </div>
            </div>
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="mb-8 px-2">
        <AppLogo />
      </div>
      <SidebarNavigation pathname={pathname} />
      <div className="mt-auto pt-6">
        <LogoutButton />
      </div>
    </>
  );
}

function AppLogo() {
  return (
    <Link className="block" href="/dashboard">
      <p className="text-xl font-semibold tracking-tight text-slate-950">Personal Invoicing</p>
      <p className="mt-1 text-sm text-slate-500">Private owner workspace</p>
    </Link>
  );
}

function SidebarNavigation({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav aria-label="Main navigation" className="space-y-1">
      {navigationItems.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
