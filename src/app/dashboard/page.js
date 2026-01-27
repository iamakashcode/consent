"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

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

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

function DashboardContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && !hasRefreshed.current) {
      hasRefreshed.current = true;
      update();
      Promise.all([fetchSites(), fetchSubscriptions()]).then(() => setPageLoading(false));
    }
  }, [session, update]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        const subsMap = {};
        if (data.subscriptions) {
          data.subscriptions.forEach((item) => {
            subsMap[item.siteId] = {
              ...item,
              userTrialActive: data.userTrialActive || false,
              userTrialDaysLeft: data.userTrialDaysLeft || null,
              userTrialEndAt: data.userTrialEndAt || null,
            };
          });
        }
        setSubscriptions(subsMap);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/sites");
      if (response.ok) {
        const data = await response.json();
        setSites(data);
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    }
  };

  const deleteSite = async (siteId) => {
    if (!confirm("Are you sure you want to delete this site?")) return;
    try {
      const response = await fetch(`/api/sites?id=${siteId}`, { method: "DELETE" });
      if (response.ok) {
        fetchSites();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete site");
      }
    } catch (err) {
      alert("An error occurred while deleting the site");
    }
  };

  const copyScript = async (site) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const scriptUrl = `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(site.domain)}`;
    const scriptTag = `<script src="${scriptUrl}"></script>`;
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      alert("Failed to copy. Please copy manually.");
    }
  };

  const handleCrawl = async () => {
    if (!domain.trim()) {
      setError("Please enter a domain name");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to crawl domain");
      }

      setResults(data);
      setDomain("");
      fetchSites();
      fetchSubscriptions();

      if (data.needsPlan) {
        router.push(`/plans?siteId=${data.siteId}&domain=${encodeURIComponent(data.domain)}`);
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || pageLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const activeCount = Object.values(subscriptions).filter((s) => s.isActive).length;
  const trialCount = Object.values(subscriptions).filter((s) => s.subscription?.status === "trial").length;
  const totalPageViews = sites.reduce((acc, site) => acc + (site.pageViews || 0), 0);

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Total Domains</span>
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{sites.length}</p>
          <p className="text-sm text-gray-500 mt-1">{activeCount} active</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Active Subscriptions</span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-sm text-gray-500 mt-1">{trialCount} in trial</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Connected</span>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{sites.filter((s) => s.isVerified).length}</p>
          <p className="text-sm text-gray-500 mt-1">Verified domains</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Page Views</span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPageViews.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpIcon />
            <span className="text-sm text-green-600">12% this month</span>
          </div>
        </div>
      </div>

      {/* Add Domain Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New Domain</h2>
            <p className="text-sm text-gray-500">Scan your website to detect trackers and cookies</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter your domain (e.g., example.com)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              onKeyPress={(e) => e.key === "Enter" && handleCrawl()}
            />
          </div>
          <button
            onClick={handleCrawl}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Scanning...
              </>
            ) : (
              <>
                <PlusIcon />
                Add Domain
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon />
              <span className="font-medium text-green-800">Domain added: {results.domain}</span>
            </div>
            {results.trackers?.length > 0 && (
              <p className="text-sm text-green-700">
                Detected {results.trackers.length} tracker{results.trackers.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Domains List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Domains</h2>
        </div>

        {sites.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {sites.map((site) => {
              const subData = subscriptions[site.siteId];
              const isActive = subData?.isActive;
              const subscription = subData?.subscription;
              const isPending = subscription?.status?.toLowerCase() === "pending";
              const isTrial = subscription?.status?.toLowerCase() === "trial" || subData?.userTrialActive;
              const trialDaysLeft = subData?.userTrialDaysLeft || subData?.trialDaysLeft;

              return (
                <div key={site.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      {isActive ? (
                        <CheckCircleIcon />
                      ) : isPending ? (
                        <ClockIcon />
                      ) : (
                        <XCircleIcon />
                      )}

                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">{site.domain}</h3>
                          {site.isVerified && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                              Connected
                            </span>
                          )}
                          {(isTrial || subData?.userTrialActive) && (trialDaysLeft || subData?.userTrialDaysLeft) && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {subData?.userTrialActive 
                                ? `User Trial: ${subData.userTrialDaysLeft || 0} days left`
                                : `Trial: ${trialDaysLeft || 0} days left`}
                            </span>
                          )}
                          {isActive && !isTrial && subscription?.plan && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                              {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                            </span>
                          )}
                          {!isActive && !subData?.userTrialActive && !isPending && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                              No Plan
                            </span>
                          )}
                          {isPending && !subData?.userTrialActive && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                              Payment Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {Array.isArray(site.trackers) ? site.trackers.length : 0} trackers detected
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <>
                          <button
                            onClick={() => copyScript(site)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              copiedId === site.id
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <CopyIcon />
                            {copiedId === site.id ? "Copied!" : "Copy Script"}
                          </button>
                          <Link
                            href="/dashboard/domains"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Manage
                            <ArrowRightIcon />
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {isPending ? "Complete Payment" : "Select Plan"}
                        </Link>
                      )}
                      <button
                        onClick={() => deleteSite(site.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete domain"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No domains yet</h3>
            <p className="text-gray-500 text-sm">Add your first domain above to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
