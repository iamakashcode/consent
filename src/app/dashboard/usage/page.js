"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
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
import { BarChart3, Globe, Activity } from "lucide-react";

function UsageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [siteStats, setSiteStats] = useState({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

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
          map[item.siteId] = { ...item, userTrialActive: data.userTrialActive || false, userTrialDaysLeft: data.userTrialDaysLeft || null };
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
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
  const totalPageViews = sites.reduce((acc, site) => acc + getViewsForSite(site), 0);
  const activeCount = Object.values(subscriptions).filter((s) => s.isActive).length;
  const success = searchParams.get("payment") === "success";
  const viewsPerDomain = sites.map((site) => ({ domain: site.domain, views: getViewsForSite(site) }));
  const maxViews = Math.max(1, ...viewsPerDomain.map((d) => d.views));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
        <p className="text-muted-foreground mt-1">Traffic and plan usage by domain — all data from your account</p>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscription activated successfully. Your usage data is now live.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total page views</CardDescription>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPageViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All domains</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Active domains</CardDescription>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">With active plan or trial</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Tracked domains</CardDescription>
            <Globe className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sites.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Connected</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Views by domain</CardTitle>
            <CardDescription>From API</CardDescription>
          </CardHeader>
          <CardContent>
            {viewsPerDomain.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No domains yet. Add a domain to see traffic.</p>
            ) : (
              <div className="h-48 flex items-end gap-2">
                {viewsPerDomain.map(({ domain, views }) => (
                  <div key={domain} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full bg-primary/80 rounded-t transition-all"
                      style={{ height: `${(views / maxViews) * 100}%`, minHeight: views > 0 ? "4px" : 0 }}
                      title={`${domain}: ${views.toLocaleString()} views`}
                    />
                    <span className="text-xs text-muted-foreground truncate w-full text-center" title={domain}>
                      {domain.replace(/^www\./, "").split(".")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by domain</CardTitle>
            <CardDescription>Plan and views per domain</CardDescription>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No domains found. Add a domain from Domains.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    const sub = subscriptions[site.siteId];
                    const isActive = sub?.isActive || false;
                    const status = sub?.subscription?.status?.toLowerCase();
                    const plan = sub?.subscription?.plan
                      ? sub.subscription.plan.charAt(0).toUpperCase() + sub.subscription.plan.slice(1)
                      : "No plan";
                    const views = getViewsForSite(site);
                    const stats = siteStats[site.siteId];
                    const recentViews = stats?.recentViews ?? null;
                    return (
                      <TableRow key={site.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{site.domain}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">Active</span>
                            )}
                            {!isActive && status === "pending" && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">Payment required</span>
                            )}
                            {!isActive && !status && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">No plan</span>
                            )}
                          </div>
                          {recentViews != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">{recentViews.toLocaleString()} views (30d)</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{plan}</TableCell>
                        <TableCell className="text-right font-medium">{views.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {sites.length > 0 && (
              <Button variant="link" className="mt-4 px-0" asChild>
                <Link href="/dashboard/domains">Manage domains →</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function UsagePage() {
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
      <UsageContent />
    </Suspense>
  );
}
