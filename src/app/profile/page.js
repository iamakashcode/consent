"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSites();
      // Refresh session on mount to ensure plan is up to date
      // This helps when admin changes the plan
      update();
    }
  }, [session, update]);

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/sites");
      if (response.ok) {
        const data = await response.json();
        setSites(data);
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScriptUrl = (site) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(
      site.domain
    )}`;
  };

  const copyScript = async (site) => {
    const scriptUrl = getScriptUrl(site);
    const scriptTag = `<script src="${scriptUrl}"></script>`;

    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy. Please copy manually.");
    }
  };

  const deleteSite = async (siteId) => {
    if (!confirm("Are you sure you want to delete this site? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/sites?id=${siteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSites(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete site");
      }
    } catch (err) {
      console.error("Failed to delete site:", err);
      alert("An error occurred while deleting the site");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const planLimits = {
    free: 1,
    starter: 5,
    pro: Infinity,
  };

  const currentPlan = session.user?.plan || "free";
  const siteLimit = planLimits[currentPlan] || 1;
  const sitesUsed = sites.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {session.user?.name || "User Profile"}
              </h1>
              <p className="text-gray-600">{session.user?.email}</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-semibold mb-2">
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {sitesUsed} / {siteLimit === Infinity ? "∞" : siteLimit} sites
              </p>
              {currentPlan !== "pro" && (
                <Link
                  href="/plans"
                  className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                >
                  View Plans & Upgrade
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sites List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Domains</h2>
            <Link
              href="/dashboard"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add New Domain
            </Link>
          </div>

          {sites.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No domains added yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start by adding your first domain to get a consent script
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Domain
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {sites.map((site) => {
                const scriptUrl = getScriptUrl(site);
                const scriptTag = `<script src="${scriptUrl}"></script>`;
                const trackers = Array.isArray(site.trackers)
                  ? site.trackers
                  : [];

                return (
                  <div
                    key={site.id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {site.domain}
                          </h3>
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Added on{" "}
                          {new Date(site.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {trackers.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            {trackers.length} tracker
                            {trackers.length !== 1 ? "s" : ""} detected
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Trackers List */}
                    {trackers.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Detected Trackers:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {trackers.map((tracker, idx) => (
                            <span
                              key={idx}
                              className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full"
                            >
                              {tracker.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Script Section */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Consent Script
                      </h4>
                      <div className="bg-gray-900 rounded-lg p-4 mb-3">
                        <code className="text-green-400 text-sm break-all">
                          {scriptTag}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyScript(site)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            copiedId === site.id
                              ? "bg-green-600 text-white"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                        >
                          {copiedId === site.id ? "✓ Copied!" : "Copy Script"}
                        </button>
                        <button
                          onClick={() => deleteSite(site.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Add this script to your website&apos;s &lt;head&gt; section,
                        before all tracking scripts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Statistics</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Domains</p>
              <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan Limit</p>
              <p className="text-2xl font-bold text-gray-900">
                {siteLimit === Infinity ? "∞" : siteLimit}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <p className="text-2xl font-bold text-indigo-600">
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </p>
            </div>
          </div>
          {sitesUsed >= siteLimit && siteLimit !== Infinity && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ You&apos;ve reached your plan limit.{" "}
                {currentPlan !== "pro" && (
                  <Link
                    href="/plans"
                    className="font-semibold underline text-yellow-800 hover:text-yellow-900"
                  >
                    View All Plans
                  </Link>
                )}
                {" "}to add more domains.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
