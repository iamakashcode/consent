"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";
import { PLAN_DETAILS } from "@/lib/paddle";
import { toast } from "sonner";
import { Receipt, CheckCircle2, XCircle, CreditCard, } from "lucide-react";


// Shared components
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

function BillingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [portalUrls, setPortalUrls] = useState({});
  const [urlLoading, setUrlLoading] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBillingData();
    }
  }, [status]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subsRes, sitesRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/sites")
      ]);

      let subsData = { subscriptions: [] };
      let sitesData = [];

      if (subsRes.ok) subsData = await subsRes.json();
      if (sitesRes.ok) sitesData = await sitesRes.json();

      // Create a map of active domains
      const activeDomainsMap = sitesData.reduce((acc, site) => {
        acc[site.siteId] = site.domain;
        return acc;
      }, {});

      // For active domains without a subscription, add a placeholder
      const subsMap = new Map();
      if (subsData.subscriptions && Array.isArray(subsData.subscriptions)) {
        subsData.subscriptions.forEach(sub => subsMap.set(sub.siteId, sub));
      }

      const allSubs = [];

      // First add all actual subscriptions from paddle
      if (subsData.subscriptions && Array.isArray(subsData.subscriptions)) {
        subsData.subscriptions.forEach(sub => {
          allSubs.push({
            ...sub,
            domain: activeDomainsMap[sub.siteId] || sub.domain || 'Unknown Domain',
            removeBrandingAddon: !!(sub?.subscription?.removeBrandingAddon || sub?.removeBrandingAddon),
            isPlaceholder: false
          });
        });
      }

      // Then add placeholders for domains without subscriptions
      Object.keys(activeDomainsMap).forEach(siteId => {
        if (!subsMap.has(siteId)) {
          allSubs.push({
            id: `placeholder-${siteId}`,
            siteId,
            domain: activeDomainsMap[siteId],
            status: 'none',
            isActive: false,
            removeBrandingAddon: false,
            isPlaceholder: true,
            subscription: null
          });
        }
      });

      // Sort by status (active first)
      allSubs.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      });

      setSubscriptions(allSubs);
    } catch (err) {
      console.error("Error fetching billing data:", err);
      setError("Failed to load billing information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPortalUrl = async (customerId, txId) => {
    try {
      setUrlLoading(prev => ({ ...prev, [txId || customerId]: true }));
      const res = await fetch(`/api/payment/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.url) {
        setPortalUrls(prev => ({ ...prev, [txId || customerId]: data.url }));
        window.open(data.url, "_blank");
      } else {
        toast.error("Could not load billing portal");
      }
    } catch (e) {
      toast.error("Failed to communicate with billing system");
    } finally {
      setUrlLoading(prev => ({ ...prev, [txId || customerId]: false }));
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
        title="Billing Details"
        description="Monitor subscriptions, access tax invoices, and update payment methods securely."
      />

      {error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-4 rounded-xl mb-6 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <XCircle className="h-5 w-5" />
            {error}
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <SectionCard hoverLift>
          <EmptyState
            icon={Receipt}
            title="No billing history"
            description="You don't have any active subscriptions or connected domains. Start by adding a domain."
          />
          <div className="text-center pb-6">
            <Button asChild className="rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700">
              <Link href="/dashboard/domains">Go to Domains</Link>
            </Button>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((sub, index) => {
            const subData = sub.subscription || {};
            const statusLower = subData.status?.toLowerCase() || sub.status?.toLowerCase();
            const planBase = subData.plan || "basic";
            const planName = PLAN_DETAILS[planBase]?.name || "Custom Plan";
            const isTrial =
              !!sub.userTrialActive ||
              (statusLower === "trial" && !!sub.isFirstDomain);

            // Setup pill colors based on status
            let statusBadge = null;
            if (sub.isPlaceholder) {
              statusBadge = <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded">No Plan</span>;
            } else if (sub.isActive) {
              if (isTrial) {
                statusBadge = <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded">Trial Active</span>;
              } else {
                statusBadge = <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded">Active</span>;
              }
            } else if (statusLower === 'past_due' || statusLower === 'pending') {
              statusBadge = <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded">Action Needed</span>;
            } else if (statusLower === 'canceled' || statusLower === 'paused') {
              statusBadge = <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 rounded">{statusLower}</span>;
            } else {
              statusBadge = <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded">{statusLower || 'Unknown'}</span>;
            }

            return (
              <SectionCard key={sub.id || sub.paddleSubscriptionId || sub.siteId || index} noPadding className="overflow-hidden group">
                <div className="p-5 sm:p-6 pb-0 sm:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">{sub.domain}</h3>
                        {statusBadge}
                      </div>
                      <p className="text-[14px] text-slate-500">
                        {sub.isPlaceholder ? "Add a subscription to start tracking." : `${planName} Tier`}
                        {subData.billingInterval && ` • Billed ${subData.billingInterval}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!sub.isPlaceholder && (
                        <>
                          {(sub.customerId || subData.customerId) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => getPortalUrl(sub.customerId || subData.customerId, sub.id)}
                              disabled={urlLoading[sub.id]}
                              className="rounded-lg h-9 text-[13px] font-medium text-slate-700 bg-white shadow-sm hover:bg-slate-50 border-slate-200"
                            >
                              {urlLoading[sub.id] ? (
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full mr-2" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5 mr-2" />
                              )}
                              Paddle Portal
                            </Button>
                          )}
                        </>
                      )}
                      <Button size="sm" asChild className="rounded-lg h-9 text-[13px] font-medium bg-indigo-50 text-indigo-700 shadow-none border border-indigo-200 hover:bg-indigo-100">
                        <Link href={`/plans?siteId=${sub.siteId}&domain=${encodeURIComponent(sub.domain)}`}>
                          {sub.isPlaceholder ? "Select Plan" : "Change Plan"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {!sub.isPlaceholder && (
                  <div className="mt-6 border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Billing Period</p>
                        <p className="text-[14px] font-medium text-slate-900 capitalize">
                          {subData.billingInterval || "Monthly"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Period Ends</p>
                        <p className="text-[14px] font-medium text-slate-900">
                          {isTrial && sub.trialEndAt ? (
                            format(new Date(sub.trialEndAt), "MMM d, yyyy")
                          ) : subData.currentPeriodEnd ? (
                            format(new Date(subData.currentPeriodEnd), "MMM d, yyyy")
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Plan Add-ons</p>
                        <div className="flex flex-col gap-1 mt-1">
                          {(sub.removeBrandingAddon || subData.removeBrandingAddon) ? (
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                              White-label UI
                            </span>
                          ) : (
                            <span className="text-[13px] text-slate-500">—</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Paddle Ref</p>
                        <p className="text-[13px] font-mono text-slate-500 truncate max-w-[120px]" title={sub.paddleSubscriptionId || subData.paddleSubscriptionId}>
                          {sub.paddleSubscriptionId || subData.paddleSubscriptionId || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function BillingPage() {
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
      <BillingContent />
    </Suspense>
  );
}
