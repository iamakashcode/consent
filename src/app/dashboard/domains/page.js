"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { getScriptPath } from "@/lib/script-urls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Globe, CheckCircle2, Clock, XCircle, Pencil, Trash2, Plus, Copy } from "lucide-react";

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

  useEffect(() => {
    if (!session || searchParams?.get("payment") !== "success") return;
    toast.success("Payment successful", {
      description: "Your domain and subscription are now active.",
    });
    fetchData(); // Refetch so new site/trial appears and pending list updates
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
        toast.success("Domain deleted", { description: `${siteToDelete.domain} has been removed.` });
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
    const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") || "";
    const scriptSrc = r2Base
      ? `${r2Base}/${getScriptPath(site.siteId, false)}`
      : `${baseUrl}/cdn/sites/${site.siteId}/script.js`;
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
        <h1 className="text-2xl font-bold tracking-tight">Domains</h1>
        <p className="text-muted-foreground mt-1">Add domains, install script, and manage plans</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add new domain</CardTitle>
          <CardDescription>Scan your website to add it and get the consent script</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. example.com"
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} disabled={addLoading}>
              {addLoading ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add domain
            </Button>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          {addResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <span className="font-medium">Added: {addResult.domain}</span>
              {addResult.trackers?.length > 0 && (
                <span className="ml-1">· {addResult.trackers.length} tracker(s) detected</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All domains</CardTitle>
            <CardDescription>Manage script, plan, and actions per domain</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {sites.length > 0 || pendingDomains.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Script</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next renewal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDomains.map((pending) => (
                  <TableRow key={pending.id} className="bg-amber-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="font-medium">{pending.domain}</span>
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Pending</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">No plan yet</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Select plan or remove</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Button size="sm" asChild>
                          <Link href={`/plans?siteId=${pending.siteId}&domain=${encodeURIComponent(pending.domain)}`}>Select plan</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmDeletePending(pending)}
                          disabled={deletingPendingId === pending.siteId}
                        >
                          {deletingPendingId === pending.siteId ? (
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
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
                  const nextRenewal = subscription?.currentPeriodEnd && isActive
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—";
                  const planLabel = subscription?.plan
                    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) + (isTrial ? " (Trial)" : "")
                    : "No plan";
                  const statusText = isActive
                    ? (isTrial ? "Free trial" : "Active")
                    : isPending
                      ? "Payment required"
                      : trialNotStarted
                        ? "No plan"
                        : "Inactive";

                  return (
                    <TableRow key={site.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{site.domain}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {scriptInstalled ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Installed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-amber-600">
                            <Clock className="h-4 w-4" /> Not detected
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{planLabel}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : isPending ? <Clock className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm">{statusText}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{nextRenewal}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {uploadMsg[site.siteId] && (
                            <span className={`text-xs ${uploadMsg[site.siteId] === "Uploaded" ? "text-emerald-600" : "text-destructive"}`}>
                              {uploadMsg[site.siteId]}
                            </span>
                          )}
                          {isActive && (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => copyScript(site)}>
                                <Copy className="h-4 w-4" />
                                {copiedId === site.id ? "Copied" : "Copy script"}
                              </Button>
                              {/* <Button variant="secondary" size="sm" onClick={() => uploadToCdn(site)} disabled={uploadingId === site.id}>
                                {uploadingId === site.id ? "Uploading…" : <><Upload className="h-4 w-4" /> Upload CDN</>}
                              </Button> */}
                              <Button variant="secondary" size="sm" asChild>
                                <Link href={`/banner?siteId=${site.siteId}`}><Pencil className="h-4 w-4" /> Manage</Link>
                              </Button>
                              <Button variant="secondary" size="sm" asChild>
                                <Link href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}>Change plan</Link>
                              </Button>
                            </>
                          )}
                          {!isActive && (
                            <Button size="sm" asChild>
                              <Link href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}>Select plan</Link>
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmDelete(site)}
                            disabled={deletingId === site.id}
                          >
                            {deletingId === site.id ? (
                              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center">
              <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Globe className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No domains yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Add your first domain using the form above.</p>
            </div>
          )}

          <Dialog open={pendingDeleteOpen} onOpenChange={setPendingDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove pending domain</DialogTitle>
                <DialogDescription>
                  Remove <strong>{pendingToDelete?.domain}</strong> from pending? You can add it again later and choose a plan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={deletePendingDomain} disabled={deletingPendingId}>
                  {deletingPendingId ? "Removing…" : "Remove"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete domain</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{siteToDelete?.domain}</strong>? This cannot be undone and the script will stop working on this domain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteSite} disabled={deletingId}>
              {deletingId ? "Deleting…" : "Delete"}
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <DomainsContent />
    </Suspense>
  );
}
