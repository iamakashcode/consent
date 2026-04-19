"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, CheckCircle2, Clock, XCircle, Pencil, Trash2, Plus, Copy, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared components
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard, SectionCardHeader } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { inputClasses } from "@/components/shared/FormField";

function DomainsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [pendingDomains, setPendingDomains] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [scriptStatus, setScriptStatus] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [deletingPendingId, setDeletingPendingId] = useState(null);
  const [domain, setDomain] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addResult, setAddResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadMsg, setUploadMsg] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const [pendingDeleteOpen, setPendingDeleteOpen] = useState(false);
  const [pendingToDelete, setPendingToDelete] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const focusSiteId = searchParams?.get("siteId");
  useEffect(() => {
    if (!focusSiteId || sites.length === 0) return;
    const id = requestAnimationFrame(() => {
      document.getElementById(`domains-row-${focusSiteId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [focusSiteId, sites.length]);

  useEffect(() => {
    if (!session || searchParams?.get("payment") !== "success") return;
    toast.success("Payment successful", {
      description: "Your domain and subscription are now active.",
    });
    fetchData();
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("siteId");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, [session, searchParams]);

  const fetchData = async () => {
    try {
      const [sitesRes, pendingRes, subsRes] = await Promise.all([
        fetch("/api/sites"),
        fetch("/api/pending-domains"),
        fetch("/api/subscription"),
      ]);
      let sitesData = [];
      if (sitesRes.ok) {
        sitesData = await sitesRes.json();
        setSites(sitesData);
      }
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingDomains(Array.isArray(pendingData) ? pendingData : []);
      }
      if (subsRes.ok) {
        const data = await subsRes.json();
        const map = {};
        (data.subscriptions || []).forEach((item) => {
          map[item.siteId] = {
            ...item,
            userTrialActive: data.userTrialActive || false,
            userTrialDaysLeft: data.userTrialDaysLeft || null,
            userTrialEndAt: data.userTrialEndAt || null,
          };
        });
        setSubscriptions(map);
      }
      if (sitesData.length > 0) {
        const statusPromises = sitesData.map(async (site) => {
          try {
            const res = await fetch(`/api/sites/${site.siteId}/script-status`);
            if (res.ok) {
              const json = await res.json();
              return { siteId: site.siteId, ...json };
            }
          } catch (_) { }
          return { siteId: site.siteId, scriptInstalled: false, isVerified: site.isVerified ?? false };
        });
        const results = await Promise.all(statusPromises);
        const statusMap = {};
        results.forEach((r) => { statusMap[r.siteId] = r; });
        setScriptStatus(statusMap);
      } else {
        setScriptStatus({});
      }
    } catch (err) {
      console.error("Failed to load domains:", err);
      toast.error("Failed to load domains");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (site) => {
    setSiteToDelete(site);
    setDeleteOpen(true);
  };

  const confirmDeletePending = (pending) => {
    setPendingToDelete(pending);
    setPendingDeleteOpen(true);
  };

  const deletePendingDomain = async () => {
    if (!pendingToDelete) return;
    setDeletingPendingId(pendingToDelete.siteId);
    try {
      const res = await fetch("/api/pending-domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: pendingToDelete.siteId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingDeleteOpen(false);
        setPendingToDelete(null);
        toast.success(data.message || "Pending domain removed");
        await fetchData();
      } else {
        toast.error(data.error || "Failed to remove");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeletingPendingId(null);
    }
  };

  const deleteSite = async () => {
    if (!siteToDelete) return;
    setDeletingId(siteToDelete.id);
    try {
      const response = await fetch(`/api/sites?id=${siteToDelete.id}`, { method: "DELETE" });
      if (response.ok) {
        setDeleteOpen(false);
        setSiteToDelete(null);
        await fetchData();
        toast.success("Domain deleted", { description: `${siteToDelete.domain} has been removed.`, });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete domain");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      setAddError("Enter a domain name");
      return;
    }
    setAddLoading(true);
    setAddError("");
    setAddResult(null);
    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add domain");
      setAddResult(data);
      setDomain("");
      await fetchData();
      toast.success("Domain added", {
        description: data.trackers?.length ? `${data.trackers.length} tracker(s) detected` : undefined,
      });
      if (data.needsPlan) {
        router.push(`/plans?siteId=${data.siteId}&domain=${encodeURIComponent(data.domain)}`);
      }
    } catch (err) {
      setAddError(err.message || "Something went wrong");
      toast.error(err.message || "Failed to add domain");
    } finally {
      setAddLoading(false);
    }
  };

  const copyScript = async (site) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const scriptSrc = `${baseUrl}/cdn/sites/${site.siteId}/script.js`;
    const scriptTag = `<script src="${scriptSrc}"></script>`;
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Script copied to clipboard");
    } catch (_) {
      toast.error("Failed to copy");
    }
  };

  const uploadToCdn = async (site) => {
    setUploadMsg((prev) => ({ ...prev, [site.siteId]: null }));
    setUploadingId(site.id);
    try {
      const res = await fetch(`/api/sites/${site.siteId}/upload-script`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setUploadMsg((prev) => ({ ...prev, [site.siteId]: "Uploaded" }));
        toast.success("Uploaded to CDN", { description: site.domain });
      } else {
        setUploadMsg((prev) => ({ ...prev, [site.siteId]: data.error || "Failed" }));
        toast.error(data.error || "Upload failed");
      }
    } catch (_) {
      setUploadMsg((prev) => ({ ...prev, [site.siteId]: "Failed" }));
      toast.error("Upload failed");
    } finally {
      setUploadingId(null);
      setTimeout(() => {
        setUploadMsg((prev) => {
          const next = { ...prev };
          delete next[site.siteId];
          return next;
        });
      }, 4000);
    }
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
        title="Domains"
        description="Add domains, monitor installation status, and manage specific consent plans per project."
      />

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6 mb-8 items-start">
        <SectionCard className="sticky top-20">
          <SectionCardHeader
            title="Add a new domain"
            description="Scan your site to begin tracking."
            icon={Plus}
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Website URL</label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. yourstartup.com"
                className={inputClasses}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
              />
            </div>

            <Button
              onClick={handleAddDomain}
              disabled={addLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm h-11"
            >
              {addLoading ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2 text-indigo-200" />
              )}
              {addLoading ? "Scanning domain..." : "Scan & Add Domain"}
            </Button>

            {addError && <p className="text-sm text-rose-500 mt-2 font-medium">{addError}</p>}

            {addResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 mt-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-emerald-800 font-medium mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully added
                </div>
                <div className="text-[13px] text-emerald-700">
                  <span className="font-semibold block">{addResult.domain}</span>
                  {addResult.trackers?.length > 0 && (
                    <span className="mt-1 block opacity-80">{addResult.trackers.length} tracker(s) detected automatically.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard noPadding>
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Your domains</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">Manage existing projects and their script integrations.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="rounded-lg h-9 text-slate-600 border-slate-200 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            {sites.length > 0 || pendingDomains.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-slate-600 h-11 px-6">Domain details</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11">Installation</TableHead>
                    <TableHead className="font-medium text-slate-600 h-11">Plan status</TableHead>
                    <TableHead className="text-right font-medium text-slate-600 h-11 px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDomains.map((pending) => (
                    <TableRow key={pending.id} className="bg-amber-50/30 hover:bg-amber-50/50 transition-colors border-b border-slate-100">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-100/80 border border-amber-200/50 flex items-center justify-center shrink-0 shadow-sm">
                            <Clock className="h-4.5 w-4.5 text-amber-600" />
                          </div>
                          <div>
                            <span className="font-semibold text-[14px] text-slate-900 block">{pending.domain}</span>
                            <span className="text-[12px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md mt-1 inline-block border border-amber-200/60">Awaiting plan</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">—</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="text-[13px] font-medium">Pending setup</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Button size="sm" asChild className="rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all h-8 px-3">
                            <Link href={`/plans?siteId=${pending.siteId}&domain=${encodeURIComponent(pending.domain)}`}>Select plan</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            onClick={() => confirmDeletePending(pending)}
                            disabled={deletingPendingId === pending.siteId}
                          >
                            {deletingPendingId === pending.siteId ? (
                              <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full inline-block" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sites.map((site) => {
                    const sub = subscriptions[site.siteId];
                    const subscription = sub?.subscription;
                    const statusLower = subscription?.status?.toLowerCase();
                    const isActive = sub?.isActive;
                    const isPending = statusLower === "pending";
                    const isTrial = statusLower === "trial" || sub?.userTrialActive;
                    const trialNotStarted = !sub?.subscription && !sub?.userTrialActive;
                    const scriptInstalled = scriptStatus[site.siteId]?.scriptInstalled ?? false;
                    const planLabel = subscription?.plan
                      ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
                      : "No active plan";
                    const statusText = isActive
                      ? (isTrial ? "Trial active" : "Active plan")
                      : isPending
                        ? "Payment required"
                        : trialNotStarted
                          ? "No plan chosen"
                          : "Inactive access";

                    const rowFocused = focusSiteId && site.siteId === focusSiteId;
                    return (
                      <TableRow
                        key={site.id}
                        id={`domains-row-${site.siteId}`}
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors border-b border-slate-100 group",
                          rowFocused && "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200/80"
                        )}
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-white group-hover:border-slate-300 transition-colors">
                              <Globe className="h-4.5 w-4.5 text-slate-500" />
                            </div>
                            <div>
                              <span className="font-semibold text-[14px] text-slate-900 block">{site.domain}</span>
                              <span className="text-[12px] text-slate-500 mt-0.5 block">{planLabel}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {scriptInstalled ? (
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md">
                              <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            ) : isPending ? (
                              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            )}
                            <span className="text-[13px] font-medium text-slate-700">{statusText}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button size="sm" asChild className="h-8 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors">
                              <Link href={`/dashboard/domains/${site.siteId}/manage`}>
                                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                                Manage
                              </Link>
                            </Button>
                            {isActive && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => copyScript(site)} className="h-8 text-xs font-medium rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                                  {copiedId === site.id ? "Copied!" : "Script"}
                                </Button>
                                <Button variant="outline" size="sm" asChild className="h-8 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition-colors">
                                  <Link href={`/banner?siteId=${site.siteId}`}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Banner</Link>
                                </Button>
                              </>
                            )}
                            {!isActive && (
                              <Button size="sm" asChild className="h-8 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors">
                                <Link href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}>Review Plan</Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg ml-1"
                              onClick={() => confirmDelete(site)}
                              disabled={deletingId === site.id}
                              title="Delete domain"
                            >
                              {deletingId === site.id ? (
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Globe}
                title="No domains connected yet"
                description="Use the form on the left to scan and add your first website. Once connected, you can install the tracking script."
              />
            )}
          </div>
        </SectionCard>
      </div>

      <Dialog open={pendingDeleteOpen} onOpenChange={setPendingDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl pb-1">Remove pending domain</DialogTitle>
            <DialogDescription className="text-[15px] pt-2">
              Remove <strong className="text-slate-900 font-semibold">{pendingToDelete?.domain}</strong> from pending list? You can easily re-scan it anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 mt-2">
            <Button variant="ghost" onClick={() => setPendingDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={deletePendingDomain} disabled={deletingPendingId} className="rounded-xl shadow-sm">
              {deletingPendingId ? "Removing…" : "Remove Domain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-rose-100">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl text-rose-600 pb-1">Delete Domain Permanently</DialogTitle>
            <DialogDescription className="text-[15px] pt-2">
              Are you sure you want to delete <strong className="text-slate-900 font-semibold">{siteToDelete?.domain}</strong>? This action cannot be undone, and any installed consent script will immediately stop functioning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 mt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={deleteSite} disabled={deletingId} className="rounded-xl shadow-sm bg-rose-600 hover:bg-rose-700">
              {deletingId ? "Deleting…" : "Yes, drop it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function DomainsPage() {
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
      <DomainsContent />
    </Suspense>
  );
}
