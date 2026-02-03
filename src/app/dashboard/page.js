"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle2, Link2, Eye } from "lucide-react";

function DashboardContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageLoading, setPageLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [siteStats, setSiteStats] = useState({});
  const hasRefreshed = useRef(false);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        const subsMap = {};
        if (data.subscriptions) {
          data.subscriptions.forEach((item) => {
            subsMap[item.siteId] = {
              ...item,
              userTrialActive: data.userTrialActive || false,
              userTrialDaysLeft: data.userTrialDaysLeft || null,
              userTrialEndAt: data.userTrialEndAt || null,
            };
          });
        }
        setSubscriptions(subsMap);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/sites");
      if (response.ok) {
        const data = await response.json();
        setSites(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    }
    return [];
  };

  const fetchAllStats = async (sitesList) => {
    if (!sitesList || sitesList.length === 0) return;
    try {
      const statsPromises = sitesList.map(async (site) => {
        try {
          const response = await fetch(`/api/sites/${site.siteId}/stats`);
          if (response.ok) {
            const stats = await response.json();
            return { siteId: site.siteId, stats };
          }
        } catch (err) {
          console.error(`Failed to fetch stats for ${site.siteId}:`, err);
        }
        return { siteId: site.siteId, stats: null };
      });
      const results = await Promise.all(statsPromises);
      const statsMap = {};
      results.forEach(({ siteId, stats }) => {
        if (stats) statsMap[siteId] = stats;
      });
      setSiteStats(statsMap);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session || hasRefreshed.current) return;
    hasRefreshed.current = true;
    update();
    let cancelled = false;
    (async () => {
      try {
        const sitesData = await fetchSites();
        await fetchSubscriptions();
        setPageLoading(false);
        if (!cancelled && sitesData?.length > 0) fetchAllStats(sitesData);
      } catch (err) {
        setPageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // Intentionally omit update from deps to prevent effect re-run (and cancelled=true) which kept pageLoading true
  }, [session]);

  useEffect(() => {
    if (!session || searchParams?.get("payment") !== "success") return;
    toast.success("Subscription active", {
      description: "Add the script on your site from Domains to start collecting consent.",
    });
    const t = setTimeout(() => {
      fetchSites().then((sitesData) => {
        fetchSubscriptions();
        if (sitesData?.length > 0) fetchAllStats(sitesData);
      });
    }, 500);
    return () => clearTimeout(t);
  }, [session, searchParams]);

  if (status === "loading" || pageLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const activeCount = Object.values(subscriptions).filter((s) => s.isActive).length;
  const trialCount = Object.values(subscriptions).filter((s) => (s.subscription?.status === "trial" || s.userTrialActive)).length;
  const totalPageViews = Object.values(siteStats).reduce((acc, stats) => acc + (stats?.totalViews || 0), 0);
  const totalUniquePages = Object.values(siteStats).reduce((acc, stats) => acc + (stats?.totalUniquePages || 0), 0);
  const verifiedCount = sites.filter((s) => s.isVerified).length;
  const paymentSuccess = searchParams?.get("payment") === "success";

  return (
    <DashboardLayout>
      {paymentSuccess && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">Subscription active</p>
            <p className="text-sm text-emerald-700">Add the script on your site from Domains to start collecting consent.</p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Traffic, domains, and subscription status from your account</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Domains</CardDescription>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sites.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeCount} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Active Subscriptions</CardDescription>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{trialCount} in trial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Connected</CardDescription>
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{verifiedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Verified domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Page Views</CardDescription>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPageViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalUniquePages} unique pages</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Manage domains</CardTitle>
            <CardDescription>Add domains, install script, and manage plans from one place.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/domains">Go to Domains</Link>
          </Button>
        </CardHeader>
      </Card>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
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
      <DashboardContent />
    </Suspense>
  );
}
