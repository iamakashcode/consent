"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, startTransition } from "react";
import Link from "next/link";
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
import { BarChart3, Globe, Activity } from "lucide-react";

// Shared components
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { SectionCard, SectionCardHeader } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { inputClasses } from "@/components/shared/FormField";
import { cn } from "@/lib/utils";

function UsageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [siteStats, setSiteStats] = useState({});
  const [selectedSiteId, setSelectedSiteId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  useEffect(() => {
    if (sites.length === 0) return;
    const param = searchParams?.get("siteId");
    const match = param && sites.find((s) => s.siteId === param || String(s.id) === param);
    startTransition(() => {
      if (match) {
        setSelectedSiteId(match.siteId);
        return;
      }
      if (param) {
        const fallback = sites[0].siteId;
        setSelectedSiteId(fallback);
        router.replace(`/dashboard/usage?siteId=${encodeURIComponent(fallback)}`, { scroll: false });
        return;
      }
      setSelectedSiteId((prev) => prev || sites[0].siteId);
    });
  }, [sites, searchParams, router]);

  useEffect(() => {
    if (!selectedSiteId || sites.length === 0) return;
    const t = requestAnimationFrame(() => {
      document.getElementById(`usage-row-${selectedSiteId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(t);
  }, [selectedSiteId, sites.length]);

  // After payment success we redirect to Domains; if user lands here (e.g. Paddle or old link), send to domains
  useEffect(() => {
    if (searchParams?.get("payment") !== "success") return;
    const siteId = searchParams.get("siteId");
    const target = siteId
      ? `/dashboard/domains?payment=success&siteId=${siteId}`
      : "/dashboard/domains?payment=success";
    router.replace(target);
  }, [searchParams, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const txnId = typeof window !== "undefined" ? sessionStorage.getItem("paddle_transaction_id") : null;
    if (!txnId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payment/confirm-pending-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: txnId,
            siteId: sessionStorage.getItem("paddle_site_id") || undefined,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          sessionStorage.removeItem("paddle_transaction_id");
          sessionStorage.removeItem("paddle_site_id");
          sessionStorage.removeItem("paddle_redirect_url");
          sessionStorage.removeItem("paddle_return_url");
          fetchData();
          toast.success("Subscription activated", { description: "Your usage data is now live." });
        }
      } catch (_) { }
    })();
    return () => { cancelled = true; };
  }, [status, session?.user]);

  const fetchData = async () => {
    try {
      const [sitesRes, subsRes] = await Promise.all([
        fetch("/api/sites"),
        fetch("/api/subscription"),
      ]);
      let sitesData = [];
      if (sitesRes.ok) {
        sitesData = await sitesRes.json();
        setSites(sitesData);
      }
      if (subsRes.ok) {
        const data = await subsRes.json();
        const map = {};
        (data.subscriptions || []).forEach((item) => {
          map[item.siteId] = { ...item };
        });
        setSubscriptions(map);
      }
      if (sitesData.length > 0) {
        const statsPromises = sitesData.map(async (site) => {
          try {
            const res = await fetch(`/api/sites/${site.siteId}/stats`);
            if (res.ok) return { siteId: site.siteId, stats: await res.json() };
          } catch (err) { console.error("Failed to fetch stats for", site.siteId, err); }
          return { siteId: site.siteId, stats: null };
        });
        const results = await Promise.all(statsPromises);
        const statsMap = {};
        results.forEach(({ siteId, stats }) => { if (stats) statsMap[siteId] = stats; });
        setSiteStats(statsMap);
      } else setSiteStats({});
    } catch (err) {
      console.error("Failed to load usage data:", err);
      toast.error("Failed to load usage data");
    } finally {
      setLoading(false);
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

  const getViewsForSite = (site) => {
    const stats = siteStats[site.siteId];
    if (stats && typeof stats.totalViews === "number") return stats.totalViews;
    return site.pageViews || 0;
  };

  const selectedSite = sites.find((s) => s.siteId === selectedSiteId);
  const totalPageViews = selectedSite ? getViewsForSite(selectedSite) : 0;
  const selectedStats = selectedSiteId ? siteStats[selectedSiteId] : null;
  const selectedRecent = selectedStats?.recentViews ?? null;
  const selectedUnique =
    selectedStats && typeof selectedStats.totalUniquePages === "number"
      ? selectedStats.totalUniquePages
      : selectedSite?.uniquePages ?? 0;

  const success = searchParams.get("payment") === "success";
  const viewsPerDomain = selectedSite
    ? [{ domain: selectedSite.domain, views: getViewsForSite(selectedSite), siteId: selectedSite.siteId }]
    : [];
  const maxViews = Math.max(1, ...viewsPerDomain.map((d) => d.views));

  return (
    <DashboardLayout>
      <PageHeader
        title="Usage Metrics"
        description="Monitor billable page views and traffic distribution across your infrastructure."
      />

      {sites.length > 0 && (
        <SectionCard hoverLift className="pb-6 border-b-0 rounded-b-none shadow-none border-t border-x mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 w-full sm:w-80">
              <label className="block text-[13px] font-semibold tracking-wide uppercase text-slate-500">Filter by Domain</label>
              <div className="relative">
                <select
                  value={selectedSiteId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedSiteId(next);
                    router.replace(`/dashboard/usage?siteId=${encodeURIComponent(next)}`, { scroll: false });
                  }}
                  className={cn(inputClasses, "appearance-none pr-10 cursor-pointer")}
                >
                  <option value="" disabled>
                    Select a workspace domain
                  </option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.siteId}>
                      {site.domain}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            {selectedSite && (
              <div className="text-right shrink-0">
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {selectedSite.domain}
                </span>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-[14px] font-medium text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Subscription activated successfully! Traffic computation is now active.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <StatsCard
          title="Page views"
          value={selectedSite ? totalPageViews.toLocaleString() : "—"}
          subtitle={selectedSite ? "Selected domain" : "Pick a domain above"}
          icon={BarChart3}
          color="indigo"
        />
        <StatsCard
          title="30-day requests"
          value={selectedRecent != null ? selectedRecent.toLocaleString() : "—"}
          subtitle={selectedSite ? "Rolling window" : "—"}
          icon={Activity}
          color="emerald"
        />
        <StatsCard
          title="Unique pages"
          value={selectedSite ? selectedUnique.toLocaleString() : "—"}
          subtitle={selectedSite ? "Tracked paths" : "—"}
          icon={Globe}
          color="violet"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard hoverLift>
          <SectionCardHeader
            title="Traffic density"
            description={selectedSite ? `View volume for ${selectedSite.domain}.` : "Select a domain to see its traffic bar."}
            icon={BarChart3}
          />
          <div className="pt-2">
            {!selectedSiteId || viewsPerDomain.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                <p className="text-[14px] font-medium text-slate-500">Select a domain above to load telemetry for that property.</p>
              </div>
            ) : (
              <div className="h-56 flex items-end gap-3 px-2 sm:px-6 mt-4">
                {viewsPerDomain.map(({ domain, views, siteId }) => (
                  <div key={domain} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-900 text-white text-[12px] font-semibold py-1.5 px-3 rounded-lg shadow-xl shadow-slate-900/20 whitespace-nowrap transition-opacity pointer-events-none z-10 hidden sm:block">
                      {views.toLocaleString()} views
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </div>
                    {/* Bar */}
                    <div
                      className={cn(
                        "w-full max-w-[48px] bg-indigo-500 group-hover:bg-indigo-400 rounded-t-lg transition-all duration-500 ease-out flex-shrink-0 relative overflow-hidden ring-1 ring-inset ring-black/5",
                        siteId === selectedSiteId && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-white"
                      )}
                      style={{ height: `${(views / maxViews) * 100}%`, minHeight: views > 0 ? "8px" : 0 }}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-white/20" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 mt-3 truncate w-full text-center group-hover:text-slate-900 transition-colors" title={domain}>
                      {domain.replace(/^www\./, "").split(".")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard noPadding hoverLift className="flex flex-col">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Tier Consumptions</h2>
            <p className="text-[13px] text-slate-500 mt-1">Review plan caps and real-time usage metrics.</p>
          </div>
          <div className="flex-1">
            {sites.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No environments found"
                description="Your workspace is empty. Add a property to start measuring tier constraints."
              />
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-medium text-slate-600 px-6 h-10 text-[13px]">Entity</TableHead>
                    <TableHead className="font-medium text-slate-600 h-10 text-[13px]">Assigned Tier</TableHead>
                    <TableHead className="text-right font-medium text-slate-600 px-6 h-10 text-[13px]">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedSiteId ? sites.filter((s) => s.siteId === selectedSiteId) : sites).map((site) => {
                    const sub = subscriptions[site.siteId];
                    const isActive = sub?.isActive || false;
                    const status = sub?.subscription?.status?.toLowerCase();
                    const plan = sub?.subscription?.plan
                      ? sub.subscription.plan.charAt(0).toUpperCase() + sub.subscription.plan.slice(1)
                      : "No plan";
                    const views = getViewsForSite(site);
                    const stats = siteStats[site.siteId];
                    const recentViews = stats?.recentViews ?? null;
                    const rowFocused = selectedSiteId && site.siteId === selectedSiteId;
                    return (
                      <TableRow
                        key={site.id}
                        id={`usage-row-${site.siteId}`}
                        className={cn(
                          "hover:bg-slate-50/30 transition-colors border-slate-100",
                          rowFocused && "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200/80"
                        )}
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center justify-between xl:justify-start xl:gap-2 flex-wrap min-w-[140px]">
                            <span className="font-semibold text-slate-900 text-[14px] truncate">{site.domain}</span>
                            <div className="flex items-center mt-1 sm:mt-0 xl:mt-1">
                              {isActive && <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-md">Online</span>}
                              {!isActive && status === "pending" && <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-md">Billing Due</span>}
                              {!isActive && !status && <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-md">Unassigned</span>}
                            </div>
                          </div>
                          {recentViews != null && (
                            <p className="text-[12px] font-medium text-slate-400 mt-1">{recentViews.toLocaleString()} reqs/30d</p>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600 text-[14px]">
                          <span className={cn(
                            "font-medium",
                            plan === "No plan" ? "text-slate-400" : "text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md"
                          )}>
                            {plan}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <span className="font-mono text-[15px] font-medium text-slate-800">{views.toLocaleString()}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          {sites.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-center">
              <Button variant="ghost" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 w-full" asChild>
                <Link
                  href={
                    selectedSiteId
                      ? `/dashboard/domains?siteId=${encodeURIComponent(selectedSiteId)}`
                      : "/dashboard/domains"
                  }
                >
                  Manage Infrastructure →
                </Link>
              </Button>
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}

export default function UsagePage() {
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
      <UsageContent />
    </Suspense>
  );
}
