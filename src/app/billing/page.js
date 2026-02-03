"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CreditCard, Clock, CheckCircle2, XCircle } from "lucide-react";

const PLAN_DETAILS = {
  basic: { name: "Basic", price: 5, pageViews: 100000 },
  starter: { name: "Starter", price: 9, pageViews: 300000 },
  pro: { name: "Pro", price: 20, pageViews: Infinity },
};

function BillingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [sites, setSites] = useState([]);
  const [userTrialActive, setUserTrialActive] = useState(false);
  const [userTrialEndAt, setUserTrialEndAt] = useState(null);
  const [userTrialDaysLeft, setUserTrialDaysLeft] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelImmediateOpen, setCancelImmediateOpen] = useState(false);
  const [cancelAllOpen, setCancelAllOpen] = useState(false);
  const [siteToCancel, setSiteToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [subsRes, sitesRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/sites"),
      ]);
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(data.subscriptions || []);
        if (data.userTrialActive !== undefined) {
          setUserTrialActive(data.userTrialActive);
          setUserTrialEndAt(data.userTrialEndAt);
          setUserTrialDaysLeft(data.userTrialDaysLeft);
        }
      }
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (siteId, immediately = false) => {
    setCancelling(true);
    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          siteId,
          cancelAtPeriodEnd: !immediately,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || "Subscription cancelled");
        setCancelOpen(false);
        setCancelImmediateOpen(false);
        setCancelAllOpen(false);
        setSiteToCancel(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancel = (sub, atEnd = true) => {
    setSiteToCancel(sub);
    atEnd ? setCancelOpen(true) : setCancelImmediateOpen(true);
  };

  const confirmCancelAll = () => {
    setCancelAllOpen(true);
  };

  const doCancelAll = async () => {
    setCancelling(true);
    const toCancel = subscriptions.filter((s) => s.isActive);
    try {
      for (const sub of toCancel) {
        const res = await fetch("/api/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel", siteId: sub.siteId, cancelAtPeriodEnd: true }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to cancel " + sub.domain);
        }
      }
      const ok = toCancel.length > 0;
      if (ok) {
        toast.success("All subscriptions will cancel at period end");
        setCancelAllOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setCancelling(false);
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

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  const totalMonthly = activeSubscriptions.reduce((acc, sub) => {
    const plan = sub.subscription?.plan || "basic";
    return acc + (PLAN_DETAILS[plan]?.price || 0);
  }, 0);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Manage your domain subscriptions and billing. All plans include a <strong>14-day free trial</strong>.
        </p>
      </div>

      {userTrialActive && userTrialDaysLeft !== null && (
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Your 14-day free trial is active</h3>
                <p className="text-sm text-blue-700">
                  {userTrialDaysLeft > 0
                    ? `${userTrialDaysLeft} day${userTrialDaysLeft !== 1 ? "s" : ""} remaining`
                    : "Your trial ends today"}
                  {userTrialEndAt && (
                    <span className="ml-2">
                      (ends {new Date(userTrialEndAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeSubscriptions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">across {sites.length} domains</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalMonthly}</p>
            <p className="text-xs text-muted-foreground mt-1">billed monthly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next Billing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeSubscriptions.length > 0 ? "Various" : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">per domain renewal</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Domain Subscriptions</CardTitle>
          <CardDescription>Each domain has its own subscription</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length > 0 ? (
            <div className="divide-y">
              {subscriptions.map((sub) => {
                const plan = sub.subscription?.plan || "basic";
                const planDetails = PLAN_DETAILS[plan];
                const status = sub.subscription?.status?.toLowerCase();
                const isTrial = status === "trial";
                const isActive = sub.isActive;
                const cancelAtPeriodEnd = sub.subscription?.cancelAtPeriodEnd;

                return (
                  <div key={sub.siteId} className="py-5 first:pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold">{sub.domain}</h3>
                          {(isTrial || userTrialActive) && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {userTrialActive ? `User Trial: ${userTrialDaysLeft ?? 0} days left` : `Trial: ${sub.trialDaysLeft ?? 0} days left`}
                            </span>
                          )}
                          {isActive && !isTrial && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          )}
                          {cancelAtPeriodEnd && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">Cancels Soon</span>
                          )}
                          {!isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                              <XCircle className="h-3 w-3" /> Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span><strong className="text-foreground">{planDetails?.name}</strong> Plan</span>
                          <span>${planDetails?.price}/{sub.subscription?.billingInterval === "yearly" ? "year" : "month"}</span>
                          <span>
                            {planDetails?.pageViews === Infinity ? "Unlimited" : planDetails?.pageViews?.toLocaleString()} page views
                          </span>
                        </div>
                        {sub.subscription?.currentPeriodEnd && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {cancelAtPeriodEnd ? "Access until" : "Renews on"}:{" "}
                            {new Date(sub.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/plans?siteId=${sub.siteId}&domain=${encodeURIComponent(sub.domain)}`}>Change Plan</Link>
                        </Button>
                        {isActive && !cancelAtPeriodEnd && (
                          <Button variant="outline" size="sm" onClick={() => confirmCancel(sub)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No subscriptions yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Add a domain and select a plan to get started</p>
              <Button asChild>
                <Link href="/dashboard/domains">Add Domain</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-medium">Cancel All Subscriptions</h3>
              <p className="text-sm text-muted-foreground">
                This will cancel all your domain subscriptions. Access continues until the end of each billing period.
              </p>
            </div>
            <Button variant="destructive" onClick={confirmCancelAll} disabled={activeSubscriptions.length === 0}>
              Cancel All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>
              Cancel <strong>{siteToCancel?.domain}</strong>? You will have access until the end of your current period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={() => siteToCancel && handleCancelSubscription(siteToCancel.siteId, false)} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel at period end"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelImmediateOpen} onOpenChange={setCancelImmediateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel immediately</DialogTitle>
            <DialogDescription>
              Cancel <strong>{siteToCancel?.domain}</strong> now? You will lose access right away.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelImmediateOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={() => siteToCancel && handleCancelSubscription(siteToCancel.siteId, true)} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelAllOpen} onOpenChange={setCancelAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel all subscriptions</DialogTitle>
            <DialogDescription>
              Cancel all {activeSubscriptions.length} subscription(s)? You will keep access until the end of each billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelAllOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={doCancelAll} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function BillingPage() {
  return <BillingContent />;
}
