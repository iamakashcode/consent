"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { ADDON_BRANDING_PRICE_EUR, PLAN_DETAILS, PLAN_CURRENCY } from "@/lib/paddle";

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

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
  const [isFirstDomain, setIsFirstDomain] = useState(true); // free trial only for first domain

  // Fetch sites count: first domain = 0 existing sites (trial); 1+ sites = no trial / upgrade
  useEffect(() => {
    if (status !== "authenticated" || !siteId) return;
    let cancelled = false;
    fetch("/api/sites")
      .then((r) => r.json())
      .then((sites) => {
        if (cancelled || !Array.isArray(sites)) return;
        // Only 0 existing sites = first domain (free trial). Pending domain not in sites until paid.
        setIsFirstDomain(sites.length === 0);
      })
      .catch(() => { if (!cancelled) setIsFirstDomain(true); });
    return () => { cancelled = true; };
  }, [siteId, status]);

  // Fetch current subscription for this domain when siteId is present
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const handlePlanSelect = async (planKey) => {
    if (!siteId) {
      alert("Please add a domain first before selecting a plan.");
      router.push("/dashboard");
      return;
    }

    const isUpgrade = currentSubscription?.isActive && ["active", "trial"].includes(currentSubscription?.status) && currentSubscription?.plan !== planKey;
    const isNewSubscription = !currentSubscription?.plan || !currentSubscription?.isActive;

    setLoading(true);
    setSelectedPlan(planKey);

    try {
      // Always use Paddle for free trial too: 14-day trial, EUR 0 now, card on file so we charge after trial
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

      // Get checkout URL (prefer checkoutUrl, then subscriptionAuthUrl)
      let checkoutUrl = data.checkoutUrl || data.subscriptionAuthUrl;

      // If checkout URL points to our domain (embedded checkout), redirect to our checkout page
      if (checkoutUrl && checkoutUrl.includes(window.location.origin)) {
        const transactionId = data.transactionId || checkoutUrl.match(/_ptxn=([^&]+)/)?.[1];
        if (transactionId) {
          checkoutUrl = `/checkout?_ptxn=${transactionId}`;
          console.log("[Plans] Using embedded checkout page:", checkoutUrl);
        }
      } else {
        console.log("[Plans] Using Paddle hosted checkout URL:", checkoutUrl);
      }

      if (checkoutUrl) {
        if (data.subscriptionId) {
          sessionStorage.setItem("paddle_subscription_id", data.subscriptionId);
        }
        if (data.transactionId) {
          sessionStorage.setItem("paddle_transaction_id", data.transactionId);
        }
        sessionStorage.setItem("paddle_site_id", siteId);
        sessionStorage.setItem("paddle_redirect_url", `/dashboard/domains?payment=success&siteId=${siteId}`);

        // Redirect to Paddle checkout (same tab for better UX)
        // Use window.location.assign to avoid React linting error
        window.location.assign(checkoutUrl);
        setLoading(false);
        setSelectedPlan(null);
        return;
      }

      if (data.subscriptionId) {
        try {
          const authResponse = await fetch(
            `/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`
          );
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.authUrl) {
              if (data.subscriptionId) {
                sessionStorage.setItem("paddle_subscription_id", data.subscriptionId);
              }
              if (data.transactionId) {
                sessionStorage.setItem("paddle_transaction_id", data.transactionId);
              }
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {siteId ? (currentSubscription?.isActive ? `Change plan for ${domain || "Your Domain"}` : `Choose Plan for ${domain || "Your Domain"}`) : "Choose Your Plan"}
        </h1>
        <p className="text-gray-500 mt-1">
          {siteId
            ? currentSubscription?.isActive
              ? "Upgrade or change your plan. Your current subscription will be cancelled and replaced after payment."
              : "Select a plan to activate consent tracking for this domain."
            : "Each domain requires its own subscription plan."}
        </p>
        {siteId && domain && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-sm font-medium text-indigo-700">{domain}</span>
            </div>
            {subscriptionLoading ? (
              <span className="text-sm text-gray-500">Loading current plan…</span>
            ) : currentSubscription?.plan ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                  Current plan: <span className="capitalize ml-1">{currentSubscription.plan}</span>
                  {currentSubscription.billingInterval === "yearly" && <span className="ml-1 text-gray-500">(Yearly)</span>}
                </span>
                {currentSubscription.userTrialActive && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm font-medium">
                    Free trial
                    {currentSubscription.trialDaysLeft != null && (
                      <span className="ml-1">— {currentSubscription.trialDaysLeft} days left</span>
                    )}
                  </span>
                )}
                {currentSubscription.removeBrandingAddon && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium">
                    Remove branding ({PLAN_CURRENCY} 3)
                  </span>
                )}
                <Link
                  href="/billing"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Cancel / manage →
                </Link>
              </div>
            ) : null}
          </div>
        )}
        {!siteId && (
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              ← Add a domain first
            </Link>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-900 font-medium">Setting up payment...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait</p>
          </div>
        </div>
      )}

      {/* Billing tabs */}
      {siteId && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setTab("monthly")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "monthly" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setTab("yearly")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "yearly" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            Yearly (save 2 months)
          </button>
        </div>
      )}

      {siteId && (
        <p className="text-sm text-gray-500 mb-4">
          Prices are final (no extra tax at checkout). e.g. {PLAN_CURRENCY} 15 + {PLAN_CURRENCY} 3 addon = {PLAN_CURRENCY} 18/month.
        </p>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => {
          const price = tab === "monthly" ? plan.monthly : plan.yearly;
          const period = tab === "monthly" ? "/month" : "/year";
          const addonSelected = addonChoiceByPlan?.[planKey] === true;
          const isCurrentPlan = currentSubscription?.plan === planKey;
          const canUpgrade = currentSubscription?.isActive && ["active", "trial"].includes(currentSubscription?.status) && !isCurrentPlan;
          const isNewSubscription = !currentSubscription?.plan || !currentSubscription?.isActive;
          const addonTrialCopy = isFirstDomain && isNewSubscription;
          const buttonLabel = !siteId
            ? "Add Domain First"
            : loading && selectedPlan === planKey
              ? "Processing..."
              : isCurrentPlan
                ? "Current plan"
                : canUpgrade
                  ? `Upgrade to ${plan.name}`
                  : isFirstDomain
                    ? "Start 14-day free trial"
                    : `Subscribe — ${PLAN_CURRENCY} ${price}${period}`;
          const disabled = !siteId || loading || isCurrentPlan;
          return (
            <div
              key={planKey}
              className={`relative bg-white rounded-xl p-6 border-2 transition-all ${isCurrentPlan ? "border-indigo-400 ring-2 ring-indigo-100" : plan.popular ? "border-indigo-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
                }`}
            >
              {plan.popular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-200">
                    Current plan
                  </span>
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">{PLAN_CURRENCY} {price}</span>
                  <span className="text-gray-500">{period}</span>
                </div>
                <p className={`text-xs font-medium mt-1 ${isFirstDomain && isNewSubscription ? "text-green-600" : "text-gray-500"}`}>
                  {isFirstDomain && isNewSubscription ? `14-day free trial • ${PLAN_CURRENCY} 0 now` : canUpgrade ? `Upgrade — ${PLAN_CURRENCY} ${price}${period} after payment` : !isFirstDomain && isNewSubscription ? `${PLAN_CURRENCY} ${price}${period} — no trial for extra domains` : "—"}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <CheckIcon />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {siteId && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      checked={addonSelected}
                      onChange={(e) =>
                        setAddonChoiceByPlan((prev) => ({ ...(prev || {}), [planKey]: e.target.checked }))
                      }
                      disabled={disabled}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Remove branding (optional)</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        <strong>Unchecked</strong> = you pay only the plan price ({PLAN_CURRENCY} {price}{period}). No {PLAN_CURRENCY} 3 charge.
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Checked</strong> = we remove &quot;Powered by Cookie Access&quot; and add {PLAN_CURRENCY} {tab === "monthly" ? ADDON_BRANDING_PRICE_EUR : ADDON_BRANDING_PRICE_EUR * 10}{tab === "monthly" ? "/month" : "/year"}. Total: {PLAN_CURRENCY} {price} + {PLAN_CURRENCY} {tab === "monthly" ? ADDON_BRANDING_PRICE_EUR : ADDON_BRANDING_PRICE_EUR * 10} = {PLAN_CURRENCY} {tab === "monthly" ? price + ADDON_BRANDING_PRICE_EUR : price + ADDON_BRANDING_PRICE_EUR * 10}{tab === "monthly" ? "/month" : "/year"}.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <button
                onClick={() => !disabled && handlePlanSelect(planKey)}
                disabled={disabled}
                className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${disabled
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : plan.popular || canUpgrade
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
              >
                {buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              q: "How does the trial work?",
              a: "Your first domain gets a 14-day free trial. Extra domains require a paid subscription from day one (no trial). You won't be charged for the first domain until the trial ends.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes! Cancel during the trial and you won't be charged. Cancel after and you'll have access until the end of your billing period.",
            },
            {
              q: "One subscription per domain?",
              a: "Yes, each domain needs its own subscription. Only your first domain gets the 14-day free trial; additional domains are paid from day one.",
            },
            {
              q: "What happens if I exceed page views?",
              a: "Your consent banner will continue working, but you'll see a warning in your dashboard. Upgrade to continue tracking accurately.",
            },
          ].map((faq, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-sm text-gray-600">{faq.a}</p>
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        </DashboardLayout>
      }
    >
      <PlansContent />
    </Suspense>
  );
}
