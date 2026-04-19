"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle2, Link2, Eye, ArrowRight } from "lucide-react";

// Import our new shared components
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { SectionCard, SectionCardHeader, SectionCardContent } from "@/components/shared/SectionCard";

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
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const activeCount = Object.values(subscriptions).filter((s) => s.isActive).length;
  const trialCount = Object.values(subscriptions).filter((s) => (s.subscription?.status === "trial" || s.userTrialActive)).length;
  const getViewsForSite = (site) => {
    const stats = siteStats[site.siteId];
    if (stats && typeof stats.totalViews === "number") return stats.totalViews;
    return site.pageViews || 0;
  };
  const totalPageViews = sites.reduce((acc, site) => acc + getViewsForSite(site), 0);
  const getUniquePagesForSite = (site) => {
    const stats = siteStats[site.siteId];
    if (stats && typeof stats.totalUniquePages === "number") return stats.totalUniquePages;
    return site.uniquePages ?? 0;
  };
  const totalUniquePages = sites.reduce((acc, site) => acc + getUniquePagesForSite(site), 0);
  const verifiedCount = sites.filter((s) => s.isVerified).length;
  const paymentSuccess = searchParams?.get("payment") === "success";

  return (
    <DashboardLayout>
      {paymentSuccess && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 flex items-center gap-4 text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold mb-0.5">Subscription active</p>
            <p className="text-sm text-emerald-700">Add the script on your site from Domains to start collecting consent.</p>
          </div>
        </div>
      )}

      <PageHeader 
        title="Overview" 
        description="Monitor your domains traffic and active subscription metrics across all your projects."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatsCard 
          title="Total Domains" 
          value={sites.length} 
          subtitle={`${activeCount} active`} 
          icon={Globe} 
          color="indigo" 
        />
        <StatsCard 
          title="Subscriptions" 
          value={activeCount} 
          subtitle={`${trialCount} in trial`} 
          icon={CheckCircle2} 
          color="emerald" 
        />
        <StatsCard 
          title="Verified" 
          value={verifiedCount} 
          subtitle="Domains" 
          icon={Link2} 
          color="violet" 
        />
        <StatsCard 
          title="Page Views" 
          value={totalPageViews.toLocaleString()} 
          subtitle={`${totalUniquePages} unique pages`} 
          icon={Eye} 
          color="blue" 
        />
      </div>

      <SectionCard hoverLift>
        <SectionCardHeader 
          title="Manage Domains" 
          description="Add domains, install tracking scripts, and manage active plans."
          icon={Globe}
          action={
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all" asChild>
              <Link href="/dashboard/domains">
                Go to Domains <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          }
        />
        <SectionCardContent>
          Connect new websites securely to ConsentFlow to immediately achieve GDPR and CCPA compliance. You can track consent logs, manage banners, and view unique visitor metrics directly per domain.
        </SectionCardContent>
      </SectionCard>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
