"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import {
  LayoutDashboard,
  Globe,
  BarChart3,
  ClipboardList,
  User,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  LayoutTemplate,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/banner", label: "Banner", icon: LayoutTemplate },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
  { href: "/dashboard/consent-log", label: "Consent Log", icon: ClipboardList },
];

function buildHrefWithSite(path, siteId) {
  if (!siteId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}siteId=${encodeURIComponent(siteId)}`;
}

function DashboardHeaderInner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const siteId = searchParams?.get("siteId") || null;

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between h-16 w-full max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8 min-w-0">
          <Link
            href={buildHrefWithSite("/dashboard", siteId)}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
              <span className="text-white font-bold text-sm tracking-widest">CF</span>
            </div>
            <span className="text-xl font-semibold text-slate-900 hidden sm:inline tracking-tight">ConsentFlow</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const href = buildHrefWithSite(item.href, siteId);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl text-[13px] sm:text-[14px] font-medium transition-all duration-200",
                    active
                      ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100/50"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-95"
                  )}
                >
                  <Icon className={cn("w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]", active ? "text-indigo-600" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn(
                "flex items-center gap-2 sm:gap-3 p-1.5 pl-2 sm:pl-3 rounded-2xl transition-all duration-200 border border-transparent",
                profileOpen ? "bg-slate-50 border-slate-200 shadow-sm" : "hover:bg-slate-50 hover:border-slate-200"
              )}
            >
              <div className="hidden sm:block text-right">
                <p className="text-[14px] font-semibold text-slate-900 leading-none mb-1">{session?.user?.name || "User"}</p>
                <p className="text-[12px] text-slate-500 truncate max-w-[140px] leading-none">{session?.user?.email}</p>
              </div>
              <div className="w-9 h-9 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-medium text-sm">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 mx-2 mb-2 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{session?.user?.name || "User"}</p>
                    <p className="text-[13px] text-slate-500 truncate">{session?.user?.email}</p>
                  </div>
                  <div className="px-2 space-y-0.5">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-3 py-2 text-[14px] font-medium text-slate-700 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="w-[18px] h-[18px] text-slate-400" />
                      Profile settings
                    </Link>
                    <Link
                      href={buildHrefWithSite("/billing", siteId)}
                      className="flex items-center gap-3 px-3 py-2 text-[14px] font-medium text-slate-700 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <CreditCard className="w-[18px] h-[18px] text-slate-400" />
                      Billing & plans
                    </Link>
                    {session?.user?.isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2 text-[14px] font-medium text-slate-700 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Settings className="w-[18px] h-[18px] text-slate-400" />
                        Admin Panel
                      </Link>
                    )}
                  </div>
                  <div className="mx-2 mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-[14px] font-medium text-rose-600 rounded-xl hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    >
                      <LogOut className="w-[18px] h-[18px] text-rose-500" />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl px-4 py-4 animate-in slide-in-from-top-2 duration-300">
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const href = buildHrefWithSite(item.href, siteId);
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-colors",
                    active
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100/50"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active ? "text-indigo-600" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

function DashboardHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm h-16" />
  );
}

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <Suspense fallback={<DashboardHeaderFallback />}>
        <DashboardHeaderInner />
      </Suspense>

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-700">
        {children}
      </main>
    </div>
  );
}
