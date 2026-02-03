"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

export default function DomainsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [sitesRes, subsRes] = await Promise.all([
        fetch("/api/sites"),
        fetch("/api/subscription"),
      ]);

      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data);
      }

      if (subsRes.ok) {
        const data = await subsRes.json();
        const map = {};
        (data.subscriptions || []).forEach((item) => {
          map[item.siteId] = {
            ...item,
            userTrialActive: data.userTrialActive || false,
            userTrialDaysLeft: data.userTrialDaysLeft || null,
            userTrialEndAt: data.userTrialEndAt || null,
          };
        });
        setSubscriptions(map);
      }
    } catch (err) {
      console.error("Failed to load domains:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSite = async (siteId, siteDbId) => {
    if (!confirm("Are you sure you want to delete this domain? This cannot be undone.")) return;
    setDeletingId(siteDbId);
    try {
      const response = await fetch(`/api/sites?id=${siteDbId}`, { method: "DELETE" });
      if (response.ok) {
        await fetchData();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete domain");
      }
    } catch (err) {
      alert("An error occurred while deleting the domain");
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-gray-500 mt-1">Manage your domains, plans, and script</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <span>+</span>
          Add domain
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All domains</h2>
          <button
            type="button"
            onClick={fetchData}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Refresh
          </button>
        </div>

        {sites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Domain</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Next renewal</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((site) => {
                  const sub = subscriptions[site.siteId];
                  const subscription = sub?.subscription;
                  const statusLower = subscription?.status?.toLowerCase();
                  const isActive = sub?.isActive;
                  const isPending = statusLower === "pending";
                  const isTrial = statusLower === "trial" || sub?.userTrialActive;
                  const trialNotStarted = !sub?.subscription && !sub?.userTrialActive;

                  const nextRenewal = subscription?.currentPeriodEnd && isActive
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—";

                  const planLabel = subscription?.plan
                    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) + (isTrial ? " (Trial)" : "")
                    : "No plan";

                  const statusIcon = isActive ? <CheckCircleIcon /> : isPending ? <ClockIcon /> : <XCircleIcon />;
                  const statusText = isActive ? "Active" : isPending ? "Payment required" : trialNotStarted ? "No plan" : "Inactive";

                  return (
                    <tr key={site.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <GlobeIcon />
                          </div>
                          <span className="font-medium text-gray-900">{site.domain}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{planLabel}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {statusIcon}
                          <span className="text-sm text-gray-700">{statusText}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{nextRenewal}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {isActive && (
                            <>
                              <Link
                                href={`/banner?siteId=${site.siteId}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                              >
                                <PencilIcon />
                                Manage
                              </Link>
                              <Link
                                href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Change plan
                              </Link>
                            </>
                          )}
                          {!isActive && !trialNotStarted && (
                            <Link
                              href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Select plan
                            </Link>
                          )}
                          {trialNotStarted && (
                            <Link
                              href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Select plan
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteSite(site.siteId, site.id)}
                            disabled={deletingId === site.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                            title="Delete domain"
                          >
                            {deletingId === site.id ? (
                              <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                            ) : (
                              <TrashIcon />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <GlobeIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No domains yet</h3>
            <p className="text-gray-500 text-sm mb-4">Add your first domain from the dashboard to get started.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
