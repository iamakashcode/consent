"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function Navigation() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastPathname = useRef(pathname);

  // Refresh session when pathname changes (user navigates) to ensure plan is up to date
  // This helps when admin changes the plan
  useEffect(() => {
    if (session && status === "authenticated" && lastPathname.current !== pathname) {
      // Only refresh when pathname actually changes (user navigates)
      lastPathname.current = pathname;
      update();
    }
  }, [pathname, session, status]);

  // Don't show navigation on login/signup pages
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const isActive = (path) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  const navLinks = session
    ? [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/profile", label: "Profile", icon: "👤" },
        { href: "/banner", label: "Banner", icon: "🎨" },
        { href: "/plans", label: "Plans", icon: "💳" },
        ...(session.user?.isAdmin ? [{ href: "/admin", label: "Admin", icon: "⚙️" }] : []),
      ]
    : [
        { href: "/", label: "Home", icon: "🏠" },
        { href: "/#pricing", label: "Pricing", icon: "💰" },
      ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center space-x-2">
              <div className="text-2xl">🍪</div>
              <span className="text-xl font-bold text-gray-900">
                Cookie Consent Manager
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {session.user?.name || session.user?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.user?.plan
                        ? `${session.user.plan.charAt(0).toUpperCase() + session.user.plan.slice(1)} Plan`
                        : ""}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-sm">
                      {session.user?.name?.charAt(0)?.toUpperCase() ||
                        session.user?.email?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/api/auth/signout"
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="border-t pt-4 mt-4">
              {session ? (
                <>
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {session.user?.name || session.user?.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.user?.plan
                        ? `${session.user.plan.charAt(0).toUpperCase() + session.user.plan.slice(1)} Plan`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href="/api/auth/signout"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Sign Out
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold text-center mt-2"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
