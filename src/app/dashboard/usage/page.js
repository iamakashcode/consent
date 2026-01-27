"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function UsagePage() {
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
          map[item.siteId] = item;
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
              return (
                <div key={site.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{site.domain}</p>
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
