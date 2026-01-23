"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [sites, setSites] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && !hasRefreshed.current) {
      // Refresh session once on mount to ensure plan is up to date
      // This helps when admin changes the plan
      hasRefreshed.current = true;
      update();
      fetchSites();
    } else if (session) {
      fetchSites();
    }
  }, [session]);

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

  const copyScript = async (site) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const scriptUrl = `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(
      site.domain
    )}`;
    const scriptTag = `<script src="${scriptUrl}"></script>`;

    try {
      await navigator.clipboard.writeText(scriptTag);
      alert("Script copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to crawl domain");
      }

      setResults(data);
      fetchSites(); // Refresh sites list
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async (siteId) => {
    setVerifyingId(siteId);
    try {
      const response = await fetch(`/api/sites/${siteId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (response.ok && data.verified) {
        // Update results to show verified status
        setResults((prev) => ({
          ...prev,
          isVerified: true,
        }));
        fetchSites(); // Refresh sites to get updated status
        alert("Domain verified successfully! The script will now work on this domain.");
      } else {
        // Show detailed error message
        let errorMessage = data.error || data.message || "Verification failed.";
        if (data.debug && process.env.NODE_ENV === "development") {
          console.log("DNS Verification Debug:", data.debug);
          errorMessage += `\n\nCheck console for debug details.`;
        }
        alert(errorMessage);
      }
    } catch (err) {
      console.error("Failed to verify domain:", err);
      alert("An error occurred while verifying the domain. Please check the console for details.");
    } finally {
      setVerifyingId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Add New Domain
          </h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter your domain (e.g., example.com)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === "Enter" && handleCrawl()}
              />
              <button
                onClick={handleCrawl}
                disabled={loading}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {loading ? "Crawling..." : "Crawl Domain"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
                {error.includes("plan limit") && (
                  <div className="mt-2">
                    <Link
                      href="/plans"
                      className="text-indigo-600 hover:text-indigo-700 font-semibold underline"
                    >
                      View Plans & Upgrade →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {results && (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Detected Tracking Codes
                  </h3>
                  {results.trackers.length > 0 ? (
                    <div className="space-y-2">
                      {results.trackers.map((tracker, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {tracker.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {tracker.details}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No tracking codes detected</p>
                  )}
                </div>

                {/* Script Section */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {results.isVerified ? (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                        ⚠ Not Connected
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-indigo-900">
                      Your Consent Script
                    </h3>
                  </div>
                  
                  {!results.isVerified && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-900 mb-2">
                        <strong>How it works:</strong> Add the script below to your website. 
                        Verification happens automatically when the script loads on your domain.
                      </p>
                      <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Copy the script tag below</li>
                        <li>Add it to your website&apos;s <code className="bg-blue-100 px-1 rounded">&lt;head&gt;</code> section</li>
                        <li>The script will automatically verify your domain when it loads</li>
                        <li>Refresh this page to check connection status</li>
                      </ol>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 mb-4">
                    Add this script tag to your website&apos;s <code className="bg-gray-200 px-1 rounded">&lt;head&gt;</code> section:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-4">
                    <code className="text-green-400 text-sm break-all">
                      {`<script src="${results.scriptUrl}"></script>`}
                    </code>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `<script src="${results.scriptUrl}"></script>`
                        );
                        alert("Script copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Copy Script
                    </button>
                    {!results.isVerified && (
                      <button
                        onClick={() => {
                          fetchSites();
                          setResults((prev) => ({ ...prev }));
                          alert("Checking connection status... Please refresh if you just added the script.");
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Check Status
                      </button>
                    )}
                  </div>

                  {results.isVerified && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✓ <strong>Connected!</strong> Your domain is verified and the script is working correctly.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Sites</h2>
          {sites.length > 0 ? (
            <div className="grid gap-4">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="bg-white rounded-lg shadow p-6 flex justify-between items-center hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{site.domain}</h3>
                      {site.isVerified ? (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                          ⚠ Not Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(site.trackers) ? site.trackers.length : 0} trackers detected
                    </p>
                  </div>
                  <div className="flex gap-3 items-center">
                    {site.isVerified ? (
                      <button
                        onClick={() => copyScript(site)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                      >
                        Copy Script
                      </button>
                    ) : (
                      <Link
                        href="/profile"
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-semibold"
                      >
                        Verify Domain
                      </Link>
                    )}
                    <button
                      onClick={() => deleteSite(site.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No sites added yet. Add your first domain above.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
