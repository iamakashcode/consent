"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";

function ConsentLogContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenMessage, setRegenMessage] = useState(null);

  const limit = 50;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/sites")
        .then((r) => r.json())
        .then((data) => {
          setSites(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0 && !selectedSiteId) {
            setSelectedSiteId(data[0].siteId);
          }
        })
        .catch(() => setSites([]))
        .finally(() => setLoading(false));
    }
  }, [session]);

  useEffect(() => {
    if (!selectedSiteId) {
      setLogs([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }
    setLogsLoading(true);
    fetch(`/api/sites/${selectedSiteId}/consent-log?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLogs([]);
          setTotal(0);
          setTotalPages(0);
        } else {
          setLogs(data.logs || []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 0);
        }
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLogsLoading(false));
  }, [selectedSiteId, page]);

  const handleRegenerateScript = async () => {
    if (!selectedSiteId) return;
    setRegenLoading(true);
    setRegenMessage(null);
    try {
      const res = await fetch(`/api/sites/${selectedSiteId}/regenerate-script`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setRegenMessage("Script updated. Accept or reject consent again to test.");
      } else {
        setRegenMessage(data.error || "Failed to regenerate");
      }
    } catch (e) {
      setRegenMessage("Request failed");
    } finally {
      setRegenLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    });
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Consent Log</h1>
        <p className="text-gray-500 mt-1">
          Record of each consent choice (accept/reject) on your site
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
          <select
          value={selectedSiteId}
          onChange={(e) => {
            setSelectedSiteId(e.target.value);
            setPage(1);
          }}
          className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select a domain</option>
          {sites.map((site) => (
            <option key={site.id} value={site.siteId}>
              {site.domain}
            </option>
          ))}
        </select>
        </div>
        {selectedSiteId && (
          <div>
            <button
              onClick={handleRegenerateScript}
              disabled={regenLoading}
              className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
            >
              {regenLoading ? "Updating..." : "Update script (enable consent log)"}
            </button>
          </div>
        )}
      </div>
      {regenMessage && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${regenMessage.includes("Failed") ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
          {regenMessage}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!selectedSiteId ? (
          <div className="p-8 text-center text-gray-500">
            Select a domain to view consent logs.
          </div>
        ) : logsLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No consent events yet. Logs appear when visitors accept or reject the consent banner.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consent ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date &amp; Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitor IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page URL
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {log.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.status === "accepted" ? "Accepted" : "Rejected"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {log.visitorIp || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.pageUrl || ""}>
                        {log.pageUrl ? (
                          <a
                            href={log.pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {log.pageUrl}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ConsentLogPage() {
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
      <ConsentLogContent />
    </Suspense>
  );
}
