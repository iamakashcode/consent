"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// Icons
const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const RevenueIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-12c1.832 0 3.376.922 3.87 2.182M12 8V6m0 2v12m0 0v-2m0 2c-1.832 0-3.376-.922-3.87-2.182" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

function formatDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
}

function formatMoney(amount, currency = "EUR") {
  const numeric = Number(amount || 0);
  return `${String(currency || "EUR").toUpperCase()} ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function AdminContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, sites: 0, subscriptions: 0, pageViews: 0, thisMonthRevenue: 0 });
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && !session?.user?.isAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, sitesRes, paymentsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/sites"),
        fetch("/api/admin/payments?limit=200"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || []);
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">Admin</span>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-gray-500">Manage users, domains, and monitor platform metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Users</span>
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <UsersIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpIcon />
            <span className="text-sm text-green-600">+12 this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Domains</span>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <GlobeIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.sites}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpIcon />
            <span className="text-sm text-green-600">+8 this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active Subscriptions</span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <CreditCardIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.subscriptions}</p>
          <p className="text-sm text-gray-500 mt-1">Monthly recurring</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Page Views</span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <ChartIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(stats.pageViews || 0).toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpIcon />
            <span className="text-sm text-green-600">+24% this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">This Month Revenue</span>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <RevenueIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">EUR {(stats.thisMonthRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm text-gray-500 mt-1">From monthly billed subscriptions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            {[
              { id: "users", label: "Users", count: users.length },
              { id: "domains", label: "Domains", count: sites.length },
              { id: "payments", label: "Payments", count: payments.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Users Table */}
        {activeTab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Domains
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{user.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user._count?.sites || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isAdmin ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Domains Table */}
        {activeTab === "domains" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Billing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Renewal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Add-ons
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Page Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{site.domain}</span>
                        {site.isVerified && (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {site.user?.email || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {site.subscription?.plan ? (
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded capitalize">
                          {site.subscription.plan}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {site.subscription?.status === "active" || site.subscription?.status === "trial" ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded capitalize">
                          {site.subscription.status}
                        </span>
                      ) : site.subscription?.status ? (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded capitalize">
                          {site.subscription.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                          No Sub
                        </span>
                      )}
                      {site.subscription?.cancelAtPeriodEnd && (
                        <div className="mt-1">
                          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                            Cancels at period end
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {site.subscription?.billingInterval || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(site.subscription?.currentPeriodEnd)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {site.subscription?.removeBrandingAddon ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          White-label
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(site._count?.pageViews || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(site.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No domains found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Table */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => {
                  const status = String(payment.status || "").toLowerCase();
                  const isPaid = ["paid", "completed", "billed", "ready"].includes(status);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-mono text-gray-700">{payment.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {payment.domain || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payment.customerEmail || payment.customerId || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded capitalize">
                          {payment.paymentType || "subscription"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                          isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {status || "unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                        {formatMoney(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.billedAt || payment.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminPage() {
  return <AdminContent />;
}
