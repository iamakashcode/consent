"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function DomainsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
          map[item.siteId] = {
            ...item,
            userTrialActive: data.userTrialActive || false,
            userTrialDaysLeft: data.userTrialDaysLeft || null,
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

  const deleteSite = async (siteId) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;
    try {
      const response = await fetch(`/api/sites?id=${siteId}`, { method: "DELETE" });
      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete domain");
      }
    } catch (err) {
      alert("An error occurred while deleting the domain");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-gray-500 mt-1">Manage domains and their subscriptions</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add Domain
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Domains</h2>
        </div>
        {sites.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {sites.map((site) => {
              const subData = subscriptions[site.siteId];
              const subscription = subData?.subscription;
              const status = subscription?.status?.toLowerCase();
              const isActive = subData?.isActive;
              const isPending = status === "pending";
              const isTrial = status === "trial" || subData?.userTrialActive;
              const statusIcon = isActive ? <CheckCircleIcon /> : isPending ? <ClockIcon /> : <XCircleIcon />;

              return (
                <div key={site.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {statusIcon}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{site.domain}</p>
                      <p className="text-xs text-gray-500">
                        {subscription?.plan ? `${subscription.plan} plan` : "No plan"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Link
                        href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Change Plan
                      </Link>
                    ) : (
                      <Link
                        href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Select Plan
                      </Link>
                    )}
                    <button
                      onClick={() => deleteSite(site.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">No domains found.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
