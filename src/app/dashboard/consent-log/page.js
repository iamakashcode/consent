"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

  const limit = 50;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
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
        .catch(() => {
          setSites([]);
          toast.error("Failed to load domains");
        })
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
        toast.error("Failed to load consent log");
      })
      .finally(() => setLogsLoading(false));
  }, [selectedSiteId, page]);

  const handleRegenerateScript = async () => {
    if (!selectedSiteId) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/sites/${selectedSiteId}/regenerate-script`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Script updated", { description: "Accept or reject consent again to test." });
      } else {
        toast.error(data.error || "Failed to regenerate");
      }
    } catch (e) {
      toast.error("Request failed");
    } finally {
      setRegenLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Consent Log</h1>
        <p className="text-muted-foreground mt-1">Record of each consent choice (accept/reject) on your site</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Domain</label>
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  "flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                <option value="">Select a domain</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.siteId}>{site.domain}</option>
                ))}
              </select>
            </div>
            {/* {selectedSiteId && (
              <Button
                variant="secondary"
                onClick={handleRegenerateScript}
                disabled={regenLoading}
              >
                {regenLoading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Update script (enable consent log)
              </Button>
            )} */}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consent events</CardTitle>
          <CardDescription>Accept/reject choices per visitor</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSiteId ? (
            <div className="py-12 text-center text-muted-foreground">
              Select a domain to view consent logs.
            </div>
          ) : logsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No consent events yet. Logs appear when visitors accept or reject the consent banner.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consent ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Visitor IP</TableHead>
                    <TableHead>Page URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.id}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                            log.status === "accepted" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          )}
                        >
                          {log.status === "accepted" ? "Accepted" : "Rejected"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{log.visitorIp || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={log.pageUrl || ""}>
                        {log.pageUrl ? (
                          <a href={log.pageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {log.pageUrl}
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing page {page} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default function ConsentLogPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <ConsentLogContent />
    </Suspense>
  );
}
