"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const ChartBar = ({ value }) => (
  <div className="flex-1 flex items-end">
    <div
      className="w-full bg-indigo-500/80 rounded-t"
      style={{ height: `${value}%` }}
      aria-hidden="true"
    />
  </div>
);

function UsageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});

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

  // If user landed here after Paddle checkout with stored transaction ID (e.g. Paddle didn't redirect to /payment/return), confirm pending domain once
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
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [status, session?.user]);

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
          };
        });
        setSubscriptions(map);
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

  const totalViews = sites.reduce((acc, site) => acc + (site.pageViews || 0), 0);
  const activeCount = Object.values(subscriptions).filter((s) => s.isActive).length;
  const chartValues = [35, 50, 40, 70, 55, 80, 60];
  const success = searchParams.get("payment") === "success";

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
        <p className="text-gray-500 mt-1">Track page views and plan usage by domain</p>
      </div>

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Subscription activated successfully. Your usage data is now live.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-2">Total Page Views</p>
          <p className="text-3xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-2">Active Domains</p>
          <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-sm text-gray-500 mt-1">With active plans</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-2">Tracked Domains</p>
          <p className="text-3xl font-bold text-gray-900">{sites.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total connected</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Page Views Trend</h2>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="h-40 flex items-end gap-2">
            {chartValues.map((value, idx) => (
              <ChartBar key={idx} value={value} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage by Domain</h2>
          <div className="space-y-3">
            {sites.length === 0 && (
              <p className="text-sm text-gray-500">No domains found.</p>
            )}
            {sites.map((site) => {
              const sub = subscriptions[site.siteId];
              const isActive = sub?.isActive || false;
              const status = sub?.subscription?.status?.toLowerCase();
              return (
                <div key={site.id} className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{site.domain}</p>
                      {isActive && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                          Active
                        </span>
                      )}
                      {!isActive && status === "pending" && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                          Payment Required
                        </span>
                      )}
                      {!isActive && !status && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          No Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {sub?.subscription?.plan ? `${sub.subscription.plan} plan` : "No plan"}
                    </p>
                  </div>
                  <div className="text-sm text-gray-700">
                    {(site.pageViews || 0).toLocaleString()} views
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function UsagePage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    }>
      <UsageContent />
    </Suspense>
  );
}
