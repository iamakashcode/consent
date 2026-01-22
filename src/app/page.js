"use client";

import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

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
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Cookie Consent Manager
          </h1>
          <p className="text-xl text-gray-600">
            Detect tracking codes and generate a consent script for your website
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter your domain (e.g., example.com)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
              onKeyPress={(e) => e.key === "Enter" && handleCrawl()}
            />
            <button
              onClick={handleCrawl}
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              {loading ? "Crawling..." : "Crawl Domain"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {results && (
            <div className="mt-8 space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Detected Tracking Codes
                </h2>
                {results.trackers.length > 0 ? (
                  <div className="space-y-3">
                    {results.trackers.map((tracker, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {tracker.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {tracker.type} - {tracker.details}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No tracking codes detected</p>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-indigo-900 mb-4">
                  Your Consent Script
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Add this script tag to your website&apos;s &lt;head&gt; section (preferably before other tracking scripts):
                </p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <code className="text-green-400 text-sm">
                    {`<script src="${results.scriptUrl}"></script>`}
                  </code>
                </div>
                <p className="text-xs text-yellow-600 mt-2 mb-4">
                  ⚠️ Note: Remove the &quot;async&quot; attribute for immediate execution, or place this script before your tracking scripts
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<script src="${results.scriptUrl}"></script>`
                    );
                    alert("Script copied to clipboard!");
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Copy Script
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  How it works
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>The script will block all detected tracking codes until consent is given</li>
                  <li>Visitors will see a cookie consent banner</li>
                  <li>Once accepted, all trackers will be enabled</li>
                  <li>Consent preference is saved in localStorage</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
