"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared components
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard, SectionCardHeader } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { inputClasses } from "@/components/shared/FormField";

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

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <PageHeader 
        title="Consent Log" 
        description="A tamper-proof audit log of every visitor consent choice recorded across your domains."
      />

      <SectionCard hoverLift className="mb-6 pb-6 border-b-0 rounded-b-none shadow-none border-t border-x mb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 w-full sm:w-80">
            <label className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500">Filter by Domain</label>
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setPage(1);
                }}
                className={cn(inputClasses, "appearance-none pr-10 curser-pointer")}
              >
                <option value="" disabled>Select a workspace domain</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.siteId}>{site.domain}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          {total > 0 && (
            <div className="text-right shrink-0 mt-4 sm:mt-0">
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                {total.toLocaleString()} total verified logs
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard noPadding className="rounded-t-none border-t-0 shadow-sm relative z-10 overflow-hidden">
        {!selectedSiteId ? (
          <EmptyState 
            icon={ClipboardList}
            title="Awaiting domain selection"
            description="Select a domain from the dropdown above to view its associated immutable consent logs."
          />
        ) : logsLoading ? (
          <div className="py-24 flex justify-center">
            <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState 
            icon={Activity}
            title="No activity detected yet"
            description="Logs will appear chronologically here the moment visitors start accepting or rejecting your consent banner."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-slate-600 h-11 px-6">Event ID</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11">Outcome</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11">Permitted Scopes</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11">Timestamp</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11">Origin IP</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11 px-6">URL Vector</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/60">
                      <TableCell className="px-6 py-4">
                        <span className="font-mono text-[13px] text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{log.id.split("-")[0]}...</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex px-2.5 py-1 text-[12px] font-semibold tracking-wide uppercase rounded-md border",
                            log.status === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-rose-50 text-rose-700 border-rose-200/60"
                          )}
                        >
                          {log.status === "accepted" ? "Authorized" : "Revoked"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.categories ? (
                          <div className="flex gap-1.5 font-medium text-[13px]">
                            {log.categories.analytics && <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">Analytics</span>}
                            {log.categories.marketing && <span className="text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">Marketing</span>}
                            {!log.categories.analytics && !log.categories.marketing && <span className="text-slate-500">Essential Only</span>}
                          </div>
                        ) : (
                          <span className="text-[13px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">All Scopes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 text-[14px]">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="font-mono text-[13px] text-slate-500">{log.visitorIp || "—"}</TableCell>
                      <TableCell className="max-w-[200px] px-6">
                        {log.pageUrl ? (
                          <div className="truncate text-[13px]">
                            <a href={log.pageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 group">
                              {new URL(log.pageUrl).pathname}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-5 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[14px] font-medium text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-600 hover:bg-white transition-colors gap-1"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-600 hover:bg-white transition-colors gap-1"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </DashboardLayout>
  );
}

export default function ConsentLogPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
          </div>
        </DashboardLayout>
      }
    >
      <ConsentLogContent />
    </Suspense>
  );
}
