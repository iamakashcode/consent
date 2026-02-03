"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

function UsageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [siteStats, setSiteStats] = useState({});

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

  // If user landed here after Paddle checkout with stored transaction ID, confirm pending domain once
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const txnId = typeof window !== "undefined" ? sessionStorage.getItem("paddle_transaction_id") : null;
    if (!txnId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payment/confirm-pending-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: txnId,
            siteId: sessionStorage.getItem("paddle_site_id") || undefined,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          sessionStorage.removeItem("paddle_transaction_id");
          sessionStorage.removeItem("paddle_site_id");
          sessionStorage.removeItem("paddle_redirect_url");
          sessionStorage.removeItem("paddle_return_url");
          fetchData();
        }
      } catch (_) { }
    })();
    return () => { cancelled = true; };
  }, [status, session?.user]);

  const fetchData = async () => {
    try {
      const [sitesRes, subsRes] = await Promise.all([
        fetch("/api/sites"),
        fetch("/api/subscription"),
      ]);

      let sitesData = [];
      if (sitesRes.ok) {
        sitesData = await sitesRes.json();
        setSites(sitesData);
      }

      if (subsRes.ok) {
        const data = await subsRes.json();
        const map = {};
        (data.subscriptions || []).forEach((item) => {
          map[item.siteId] = {
            ...item,
            userTrialActive: data.userTrialActive || false,
            userTrialDaysLeft: data.userTrialDaysLeft || null,
          };
        });
        setSubscriptions(map);
      }

      // Fetch real stats per site from API (totalViews, recentViews)
      if (sitesData.length > 0) {
        const statsPromises = sitesData.map(async (site) => {
          try {
            const res = await fetch(`/api/sites/${site.siteId}/stats`);
            if (res.ok) {
              const stats = await res.json();
              return { siteId: site.siteId, stats };
            }
          } catch (err) {
            console.error("Failed to fetch stats for", site.siteId, err);
          }
          return { siteId: site.siteId, stats: null };
        });
        const results = await Promise.all(statsPromises);
        const statsMap = {};
        results.forEach(({ siteId, stats }) => {
          if (stats) statsMap[siteId] = stats;
        });
        setSiteStats(statsMap);
      } else {
        setSiteStats({});
      }
    } catch (err) {
      console.error("Failed to load usage data:", err);
    } finally {
      setLoading(false);
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

  // Real totals from API: prefer stats.totalViews per site, fallback to site.pageViews
  const getViewsForSite = (site) => {
    const stats = siteStats[site.siteId];
    if (stats && typeof stats.totalViews === "number") return stats.totalViews;
    return site.pageViews || 0;
  };

  const totalPageViews = sites.reduce((acc, site) => acc + getViewsForSite(site), 0);
  const activeCount = Object.values(subscriptions).filter((s) => s.isActive).length;
  const success = searchParams.get("payment") === "success";

  // Chart: real views per domain (max bar height 100%)
  const viewsPerDomain = sites.map((site) => ({ domain: site.domain, views: getViewsForSite(site) }));
  const maxViews = Math.max(1, ...viewsPerDomain.map((d) => d.views));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
        <p className="text-gray-500 mt-1">Traffic and plan usage by domain — all data from your account</p>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscription activated successfully. Your usage data is now live.
        </div>
      )}

      {/* Stats from API */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total page views</p>
          <p className="text-3xl font-bold text-gray-900">{totalPageViews.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All domains</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Active domains</p>
          <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">With active plan or trial</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Tracked domains</p>
          <p className="text-3xl font-bold text-gray-900">{sites.length}</p>
          <p className="text-xs text-gray-500 mt-1">Connected</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart from real data */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Views by domain</h2>
            <span className="text-xs text-gray-500">From API</span>
          </div>
          {viewsPerDomain.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No domains yet. Add a domain to see traffic.</p>
          ) : (
            <div className="h-48 flex items-end gap-2">
              {viewsPerDomain.map(({ domain, views }) => (
                <div key={domain} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full bg-indigo-500/80 rounded-t transition-all"
                    style={{ height: `${(views / maxViews) * 100}%`, minHeight: views > 0 ? "4px" : 0 }}
                    title={`${domain}: ${views.toLocaleString()} views`}
                  />
                  <span className="text-xs text-gray-500 truncate w-full text-center" title={domain}>
                    {domain.replace(/^www\./, "").split(".")[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage by domain: domain, plan, status, views — all from API */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage by domain</h2>
          <div className="space-y-3">
            {sites.length === 0 && (
              <p className="text-sm text-gray-500">No domains found. Add a domain from the dashboard.</p>
            )}
            {sites.map((site) => {
              const sub = subscriptions[site.siteId];
              const isActive = sub?.isActive || false;
              const status = sub?.subscription?.status?.toLowerCase();
              const plan = sub?.subscription?.plan
                ? sub.subscription.plan.charAt(0).toUpperCase() + sub.subscription.plan.slice(1)
                : "No plan";
              const views = getViewsForSite(site);
              const stats = siteStats[site.siteId];
              const recentViews = stats?.recentViews ?? null;

              return (
                <div
                  key={site.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{site.domain}</p>
                      {isActive && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                          Active
                        </span>
                      )}
                      {!isActive && status === "pending" && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                          Payment required
                        </span>
                      )}
                      {!isActive && !status && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          No plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {plan}
                      {recentViews != null && (
                        <span className="ml-1">· {recentViews.toLocaleString()} views (30d)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-gray-900 whitespace-nowrap pl-2">
                    {views.toLocaleString()} views
                  </div>
                </div>
              );
            })}
          </div>
          {sites.length > 0 && (
            <Link
              href="/dashboard/domains"
              className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Manage domains →
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function UsagePage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <UsageContent />
    </Suspense>
  );
}
