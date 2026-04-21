"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { ADDON_BRANDING_PRICE_EUR, PLAN_DETAILS, PLAN_CURRENCY } from "@/lib/paddle";
import { Check, ArrowRight, ShieldCheck, Zap, Server } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared components
import { PageHeader } from "@/components/shared/PageHeader";

function PlansContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [tab, setTab] = useState("monthly");
  const [addonChoiceByPlan, setAddonChoiceByPlan] = useState({});

  const siteId = searchParams?.get("siteId") || null;
  const domain = searchParams?.get("domain") || null;
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(!!siteId);
  const [isFirstDomain, setIsFirstDomain] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !siteId) return;
    let cancelled = false;
    fetch("/api/sites")
      .then((r) => r.json())
      .then((sites) => {
        if (cancelled || !Array.isArray(sites)) return;
        setIsFirstDomain(sites.length === 0);
      })
      .catch(() => { if (!cancelled) setIsFirstDomain(true); });
    return () => { cancelled = true; };
  }, [siteId, status]);

  useEffect(() => {
    if (!siteId || status !== "authenticated") {
      if (siteId && status === "authenticated") setSubscriptionLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/subscription?siteId=${encodeURIComponent(siteId)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const sub = data.subscription;
          if (!sub) {
            setCurrentSubscription(null);
          } else {
            setCurrentSubscription({
              plan: sub.plan,
              status: sub.status?.toLowerCase(),
              isActive: data.isActive,
              billingInterval: sub.billingInterval || "monthly",
              removeBrandingAddon: !!sub.removeBrandingAddon,
              trialEndAt: data.trialEndAt,
              trialDaysLeft: data.trialDaysLeft,
              userTrialActive: !!data.userTrialActive,
            });
            if (sub.billingInterval === "yearly") setTab("yearly");
          }
        } else {
          setCurrentSubscription(null);
        }
      } catch (_) {
        if (!cancelled) setCurrentSubscription(null);
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteId, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = siteId
        ? `/plans?siteId=${siteId}&domain=${encodeURIComponent(domain || "")}`
        : "/plans";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, siteId, domain]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const handlePlanSelect = async (planKey) => {
    if (!siteId) {
      alert("Please add a domain first before selecting a plan.");
      router.push("/dashboard/domains");
      return;
    }

    // Include `pending` (abandoned checkout): server must receive `upgrade: true` so checkout stays non-trial. Also treat billing-interval change as upgrade.
    const isUpgrade =
      !!currentSubscription?.plan &&
      ["active", "trial", "pending"].includes(currentSubscription?.status || "") &&
      (currentSubscription.plan !== planKey ||
        String(currentSubscription.billingInterval || "monthly").toLowerCase() !== String(tab).toLowerCase());
    setLoading(true);
    setSelectedPlan(planKey);

    try {
      const isCurrentPlanSelection = currentSubscription?.plan === planKey;
      const addonRequested = addonChoiceByPlan?.[planKey] === true;
      const addonAlreadyActive = !!currentSubscription?.removeBrandingAddon;
      const addonEligibleStatus = ["active", "trial"].includes(currentSubscription?.status || "");

      // Current-plan add-on purchase path (no plan switch).
      if (isCurrentPlanSelection && addonRequested && !addonAlreadyActive) {
        if (!addonEligibleStatus) {
          alert("Your subscription must be active (or in trial) to add the white-label addon.");
          setLoading(false);
          setSelectedPlan(null);
          return;
        }

        const addonResponse = await fetch("/api/payment/create-addon-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            addonType: "remove_branding",
          }),
        });
        const addonData = await addonResponse.json();

        if (!addonResponse.ok) {
          alert(addonData.error || "Failed to set up add-on checkout. Please try again.");
          setLoading(false);
          setSelectedPlan(null);
          return;
        }

        const addonCheckoutUrl = addonData.checkoutUrl;
        if (addonCheckoutUrl) {
          if (addonData.transactionId) sessionStorage.setItem("paddle_transaction_id", addonData.transactionId);
          sessionStorage.setItem("paddle_site_id", siteId);
          window.location.assign(addonCheckoutUrl);
          setLoading(false);
          setSelectedPlan(null);
          return;
        }
      }

      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          siteId,
          billingInterval: tab,
          upgrade: isUpgrade,
          addons: { removeBranding: addonChoiceByPlan?.[planKey] === true ? true : false },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to set up payment. Please try again.");
        setLoading(false);
        setSelectedPlan(null);
        return;
      }

      let checkoutUrl = data.checkoutUrl || data.subscriptionAuthUrl;
      if (checkoutUrl && checkoutUrl.includes(window.location.origin)) {
        const transactionId = data.transactionId || checkoutUrl.match(/_ptxn=([^&]+)/)?.[1];
        if (transactionId) {
          checkoutUrl = `/checkout?_ptxn=${transactionId}`;
        }
      }

      if (checkoutUrl) {
        if (data.subscriptionId) sessionStorage.setItem("paddle_subscription_id", data.subscriptionId);
        if (data.transactionId) sessionStorage.setItem("paddle_transaction_id", data.transactionId);
        sessionStorage.setItem("paddle_site_id", siteId);
        sessionStorage.setItem("paddle_redirect_url", `/dashboard/domains?payment=success&siteId=${siteId}`);

        window.location.assign(checkoutUrl);
        setLoading(false);
        setSelectedPlan(null);
        return;
      }

      if (data.subscriptionId) {
        try {
          const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.authUrl) {
              if (data.subscriptionId) sessionStorage.setItem("paddle_subscription_id", data.subscriptionId);
              if (data.transactionId) sessionStorage.setItem("paddle_transaction_id", data.transactionId);
              sessionStorage.setItem("paddle_site_id", siteId);
              window.open(authData.authUrl, "_blank");
              setLoading(false);
              setSelectedPlan(null);
              alert("Payment page opened. Return here after completing payment.");
              return;
            }
          }
        } catch (e) {
          console.error("Error fetching auth URL:", e);
        }
      }

      setLoading(false);
      setSelectedPlan(null);
      router.push(`/payment?plan=${planKey}&siteId=${siteId}`);
    } catch (err) {
      console.error("Error selecting plan:", err);
      alert("Failed to set up payment. Please try again.");
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={siteId ? (currentSubscription?.isActive ? `Change plan for ${domain || "your domain"}` : `Choose plan for ${domain || "your domain"}`) : "Choose your plan"}
        description={siteId ? (currentSubscription?.isActive ? "Upgrade your tier to unlock more features." : "Select a tier to activate consent tracking on your property.") : "Start by adding a domain from your dashboard to select a plan."}
      />

      {siteId && domain && currentSubscription?.plan && !subscriptionLoading && (
        <div className="mb-10 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest">Current Status</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[13px] font-medium shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />
                <span className="capitalize">{currentSubscription.plan}</span>
                {currentSubscription.billingInterval === "yearly" && <span className="ml-1 text-slate-400 font-normal">Yearly</span>}
              </span>

              {currentSubscription.userTrialActive && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium shadow-sm">
                  Active Trial
                  {currentSubscription.trialDaysLeft != null && (
                    <span className="ml-1 opacity-80 font-normal">— {currentSubscription.trialDaysLeft}d left</span>
                  )}
                </span>
              )}

              {currentSubscription.removeBrandingAddon && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[13px] font-medium shadow-sm">
                  White-label Addon Active
                </span>
              )}
            </div>
          </div>
          <Link href="/billing" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors hover:bg-slate-50">
            Manage Subscription <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Preparing Checkout</h3>
            <p className="text-[15px] text-slate-500 mt-2">Connecting to secure payment gateway...</p>
          </div>
        </div>
      )}

      {siteId && (
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setTab("monthly")}
              className={cn(
                "px-6 py-2.5 text-[14px] font-semibold tracking-wide rounded-lg transition-all duration-200",
                tab === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              Pay Monthly
            </button>
            <button
              onClick={() => setTab("yearly")}
              className={cn(
                "px-6 py-2.5 text-[14px] font-semibold tracking-wide rounded-lg transition-all duration-200 flex items-center gap-2",
                tab === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              Pay Yearly <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded mr-1">Save ~16%</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16 items-start">
        {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => {
          const price = tab === "monthly" ? plan.monthly : plan.yearly;
          const period = tab === "monthly" ? "/month" : "/year";
          const isCurrentPlan = currentSubscription?.plan === planKey;
          const currentPlanAddonActive = isCurrentPlan && !!currentSubscription?.removeBrandingAddon;
          const addonSelected = currentPlanAddonActive ? true : addonChoiceByPlan?.[planKey] === true;
          const canUpgrade = currentSubscription?.isActive && ["active", "trial"].includes(currentSubscription?.status) && !isCurrentPlan;
          const canBuyAddonOnCurrentPlan =
            isCurrentPlan &&
            currentSubscription?.isActive &&
            ["active", "trial"].includes(currentSubscription?.status || "") &&
            !currentPlanAddonActive;
          const isNewSubscription = !currentSubscription?.plan || !currentSubscription?.isActive;
          const disabled =
            !siteId ||
            loading ||
            (isCurrentPlan
              ? currentPlanAddonActive || (canBuyAddonOnCurrentPlan && !addonSelected) || !canBuyAddonOnCurrentPlan
              : false);

          let buttonLabel = !siteId ? "Add Domain First" : isCurrentPlan ? "Current Plan Active" : canUpgrade ? `Switch to ${plan.name}` : `Subscribe for ${PLAN_CURRENCY} ${price}${period}`;
          if (canBuyAddonOnCurrentPlan && addonSelected) buttonLabel = "Add White-label Addon";
          if (currentPlanAddonActive) buttonLabel = "White-label Active";
          if (canBuyAddonOnCurrentPlan && !addonSelected) buttonLabel = "Select Addon to Continue";
          if (isFirstDomain && isNewSubscription && siteId) buttonLabel = "Start 14-day Free Trial";

          return (
            <div
              key={planKey}
              className={cn(
                "relative bg-white rounded-3xl p-8 transition-all duration-300 flex flex-col h-full",
                isCurrentPlan
                  ? "border-2 border-indigo-200 ring-4 ring-indigo-50 shadow-md"
                  : plan.popular
                    ? "border-2 border-slate-900 shadow-xl lg:-mt-4 lg:mb-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white"
                    : "border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
              )}
            >
              {plan.popular && !isCurrentPlan && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-indigo-500 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-md z-10 border border-indigo-400">
                    Most Selected
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-sm z-10 border border-indigo-200">
                    Active Plan
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={cn("text-2xl font-bold tracking-tight", plan.popular && !isCurrentPlan ? "text-white" : "text-slate-900")}>{plan.name}</h3>
                <p className={cn("text-[14px] mt-2", plan.popular && !isCurrentPlan ? "text-slate-300" : "text-slate-500")}>{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-4xl font-extrabold tracking-tight", plan.popular && !isCurrentPlan ? "text-white" : "text-slate-900")}>
                    {PLAN_CURRENCY}{price}
                  </span>
                  <span className={cn("text-[15px] font-medium", plan.popular && !isCurrentPlan ? "text-slate-400" : "text-slate-500")}>
                    {period}
                  </span>
                </div>
                {isFirstDomain && isNewSubscription && (
                  <p className="text-[13px] font-medium text-emerald-500 mt-2 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 fill-current" /> Includes 14-day free trial
                  </p>
                )}
              </div>

              <div className="flex-1">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-full p-0.5",
                        plan.popular && !isCurrentPlan ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-50 text-indigo-600"
                      )}>
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </div>
                      <span className={cn("text-[14px] leading-snug font-medium", plan.popular && !isCurrentPlan ? "text-slate-300" : "text-slate-600")}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {siteId && (
                <div className={cn(
                  "mb-6 rounded-xl p-4 transition-colors",
                  plan.popular && !isCurrentPlan ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100",
                  "border"
                )}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className={cn(
                      "mt-0.5 flex shrink-0 items-center justify-center rounded border h-5 w-5 transition-colors",
                      addonSelected
                        ? plan.popular && !isCurrentPlan ? "bg-indigo-500 border-indigo-500" : "bg-indigo-600 border-indigo-600"
                        : plan.popular && !isCurrentPlan ? "border-slate-600 group-hover:border-slate-500" : "border-slate-300 bg-white group-hover:border-slate-400"
                    )}>
                      {addonSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={addonSelected}
                        onChange={(e) => setAddonChoiceByPlan((prev) => ({ ...(prev || {}), [planKey]: e.target.checked }))}
                        disabled={!siteId || loading || currentPlanAddonActive}
                      />
                    </div>
                    <div>
                      <p className={cn("text-[14px] font-semibold", plan.popular && !isCurrentPlan ? "text-white" : "text-slate-900")}>
                        White-label Addon
                      </p>
                      <p className={cn("text-[12px] mt-1 leading-relaxed", plan.popular && !isCurrentPlan ? "text-slate-400" : "text-slate-500")}>
                        Remove &quot;Powered by ConsentFlow&quot; branding from the public banner. <strong className={plan.popular && !isCurrentPlan ? "text-slate-300" : "text-slate-700"}>+{PLAN_CURRENCY}{tab === "monthly" ? ADDON_BRANDING_PRICE_EUR : ADDON_BRANDING_PRICE_EUR * 10}{period}</strong>
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <button
                onClick={() => !disabled && handlePlanSelect(planKey)}
                disabled={disabled}
                className={cn(
                  "w-full py-4 text-[15px] font-bold tracking-wide rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group",
                  disabled
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    : isCurrentPlan
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-default"
                      : plan.popular && !isCurrentPlan
                        ? "bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-indigo-500/25 hover:shadow-lg"
                        : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg"
                )}
              >
                {buttonLabel}
                {!disabled && !isCurrentPlan && <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-8 text-center">Common Questions</h2>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
          {[
            {
              icon: ShieldCheck,
              q: "How does the trial work?",
              a: "Your first domain receives an unrestricted 14-day free trial on any tier. We collect payment details upfront to prevent abuse, but won't charge you until day 15. You can cancel anytime before then.",
            },
            {
              icon: Zap,
              q: "Can I manage multiple domains?",
              a: "Yes. Each workspace domain operates concurrently but requires its own separate subscription. This ensures usage limits and tracking isolations remain strict per domain.",
            },
            {
              icon: Server,
              q: "What happens if I exceed limits?",
              a: "Your consent banners will remain active and compliant. However, you will stop receiving detailed analytics logs in your dashboard until you upgrade to the next tier.",
            },
            {
              icon: Check,
              q: "Is it easy to cancel?",
              a: "Incredibly easy. You can cancel your subscription from your billing dashboard with a single click. You'll retain access to your chosen tier until the end of your billing cycle.",
            },
          ].map((faq, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                <faq.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900 mb-1.5">{faq.q}</h3>
                <p className="text-[14px] text-slate-500 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PlansPage() {
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
      <PlansContent />
    </Suspense>
  );
}
