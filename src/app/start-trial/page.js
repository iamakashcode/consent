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

function StartTrialContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [profile, setProfile] = useState(null);
  const [domain, setDomain] = useState("");
  const [siteId, setSiteId] = useState(null);
  const [tab, setTab] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [crawlError, setCrawlError] = useState("");
  const [starting, setStarting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState("");
  const [isFirstDomain, setIsFirstDomain] = useState(true);
  const [addonChoiceByPlan, setAddonChoiceByPlan] = useState({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/start-trial" + (callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""))}`);
      return;
    }
    if (status !== "authenticated") return;

    const run = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (!res.ok) {
          setLoading(false);
          return;
        }
        setProfile(data);
        let d = (data.websiteUrl || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
        if (d) setDomain(d);

        if (data.trialEndAt && new Date(data.trialEndAt) > new Date()) {
          router.push(callbackUrl);
          return;
        }

        if (!d) {
          setLoading(false);
          return;
        }

        const [sitesRes, crawlRes] = await Promise.all([
          fetch("/api/sites"),
          fetch("/api/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: d }) }),
        ]);
        const sitesData = sitesRes.ok ? await sitesRes.json() : [];
        const crawlData = await crawlRes.json();
        if (crawlRes.ok && crawlData.siteId) {
          setSiteId(crawlData.siteId);
          setCrawlError("");
          setIsFirstDomain(Array.isArray(sitesData) && sitesData.length === 0);
        } else {
          setCrawlError(crawlData.error || "Could not add domain. Check the domain and try again.");
        }
      } catch (err) {
        setCrawlError("Failed to load. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [status, router, callbackUrl]);

  const handlePlanSelect = async (planKey) => {
    if (!siteId) {
      setError("Domain is not ready. Please wait or refresh.");
      return;
    }
    setStarting(true);
    setSelectedPlan(planKey);
    setError("");
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, siteId, billingInterval: tab, addons: { removeBranding: addonChoiceByPlan?.[planKey] === true } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open checkout.");
        setStarting(false);
        setSelectedPlan(null);
        return;
      }
      const checkoutUrl = data.checkoutUrl || data.subscriptionAuthUrl;
      if (checkoutUrl) {
        // Store for return page so domain can be confirmed even if Paddle doesn't pass transaction_id in URL
        if (typeof sessionStorage !== "undefined") {
          if (data.transactionId) sessionStorage.setItem("paddle_transaction_id", data.transactionId);
          if (siteId) sessionStorage.setItem("paddle_site_id", siteId);
          sessionStorage.setItem("paddle_redirect_url", "/dashboard?payment=success");
        }
        if (checkoutUrl.includes(window.location.origin)) {
          const txn = data.transactionId || checkoutUrl.match(/_ptxn=([^&]+)/)?.[1];
          window.location.href = txn ? `/checkout?_ptxn=${txn}` : checkoutUrl;
        } else {
          window.location.href = checkoutUrl;
        }
        return;
      }
      setError("Checkout URL not available.");
      setStarting(false);
      setSelectedPlan(null);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setStarting(false);
      setSelectedPlan(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose your plan</h1>
        <p className="text-gray-500 mb-6">
          Select one plan to start your 14-day free trial on your first domain. You will be taken to checkout ({`payment ${PLAN_CURRENCY} 0 during trial for first domain`}).
        </p>

        {profile?.websiteUrl && (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-sm font-medium text-indigo-700">Domain: {domain || profile.websiteUrl}</span>
          </div>
        )}

        {!domain && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            No domain from signup. Please add your domain on the dashboard first, then come back to select a plan.
            <Link href="/dashboard" className="block mt-2 font-medium text-indigo-600 hover:text-indigo-700">Go to dashboard →</Link>
          </div>
        )}

        {crawlError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {crawlError}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {siteId && (
          <>
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => setTab("monthly")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "monthly"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setTab("yearly")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "yearly"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Yearly (save 2 months)
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => {
                const price = tab === "monthly" ? plan.monthly : plan.yearly;
                const period = tab === "monthly" ? "/month" : "/year";
                const addonSelected = addonChoiceByPlan?.[planKey] === true;
                return (
                  <div
                    key={planKey}
                    className={`relative bg-white rounded-xl p-6 border-2 transition-all ${plan.popular ? "border-indigo-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</span>
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">{PLAN_CURRENCY} {price}</span>
                      <span className="text-gray-500">{period}</span>
                    </div>
                    <p className="text-xs text-green-600 font-medium mb-4">{isFirstDomain ? `14-day free trial • ${PLAN_CURRENCY} 0 now` : `${PLAN_CURRENCY} ${price}${period} — no trial for extra domains`}</p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckIcon />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          checked={addonSelected}
                          onChange={(e) =>
                            setAddonChoiceByPlan((prev) => ({ ...(prev || {}), [planKey]: e.target.checked }))
                          }
                          disabled={starting}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Remove branding (optional)</p>
                          <p className="text-sm text-gray-700">
                            Banner se &quot;Powered by Cookie Access&quot; hata denge.{" "}
                            <span className="font-semibold text-green-700">
                              14 din free, phir {PLAN_CURRENCY} {tab === "monthly" ? ADDON_BRANDING_PRICE_EUR : ADDON_BRANDING_PRICE_EUR * 10}{tab === "monthly" ? "/month" : "/year"}
                            </span>
                          </p>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={() => handlePlanSelect(planKey)}
                      disabled={starting}
                      className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${plan.popular
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {starting && selectedPlan === planKey ? "Opening checkout…" : isFirstDomain ? "Start 14-day free trial" : `Subscribe — ${PLAN_CURRENCY} ${price}${period}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {domain && !siteId && !crawlError && loading === false && (
          <div className="text-center py-8 text-gray-500">Preparing your domain…</div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function StartTrialPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <StartTrialContent />
    </Suspense>
  );
}
