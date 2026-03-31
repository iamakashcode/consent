"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ADDON_BRANDING_PRICE_EUR, PLAN_DETAILS, PLAN_CURRENCY } from "@/lib/paddle";
import { Check, ShieldCheck, Zap, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      setError("Domain setup is not yet complete. Please wait a moment.");
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
        setError(data.error || "Failed to open secure checkout connection.");
        setStarting(false);
        setSelectedPlan(null);
        return;
      }
      
      const checkoutUrl = data.checkoutUrl || data.subscriptionAuthUrl;
      
      if (checkoutUrl) {
        if (typeof sessionStorage !== "undefined") {
          if (data.transactionId) sessionStorage.setItem("paddle_transaction_id", data.transactionId);
          if (siteId) sessionStorage.setItem("paddle_site_id", siteId);
          sessionStorage.setItem("paddle_redirect_url", "/dashboard/domains?payment=success");
        }
        
        if (checkoutUrl.includes(window.location.origin)) {
          const txn = data.transactionId || checkoutUrl.match(/_ptxn=([^&]+)/)?.[1];
          if (txn) {
            router.push(`/checkout?_ptxn=${txn}`);
          } else {
            window.location.href = checkoutUrl;
          }
        } else {
          window.location.href = checkoutUrl;
        }
        return;
      }
      
      setError("Payment gateway response was invalid.");
      setStarting(false);
      setSelectedPlan(null);
    } catch (err) {
      setError("A secure connection could not be established. Please try again.");
      setStarting(false);
      setSelectedPlan(null);
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
        title="Activate Your Account" 
        description="Select a robust tier to manage cookie consents, secure privacy requirements, and track compliance metrics."
      />

      <div className="max-w-6xl mx-auto pb-12">
        
        {/* Domain Selection Header Context */}
        <div className="mb-10 flex flex-col items-center">
            {profile?.websiteUrl ? (
               <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-full shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[14px] font-bold text-indigo-900 tracking-tight">Active Domain: <span className="opacity-75">{domain || profile.websiteUrl}</span></span>
               </div>
            ) : (!domain && (
               <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl w-full max-w-lg text-center shadow-sm">
                  <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-[14px] font-bold text-amber-900 mb-1">No Primary Domain Found</p>
                  <p className="text-[13px] text-amber-700 font-medium mb-4 leading-relaxed">Please configure a domain baseline before selecting a compliance tier.</p>
                  <Button asChild className="rounded-xl shadow-sm h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                     <Link href="/dashboard">Configure Infrastructure</Link>
                  </Button>
               </div>
            ))}
            
            {(crawlError || error) && (
               <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl w-full max-w-lg text-center shadow-sm">
                  <p className="text-[13px] font-bold text-rose-800">{crawlError || error}</p>
               </div>
            )}
        </div>

        {siteId && (
          <>
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

            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => {
                const price = tab === "monthly" ? plan.monthly : plan.yearly;
                const period = tab === "monthly" ? "/month" : "/year";
                const addonSelected = addonChoiceByPlan?.[planKey] === true;
                const isStarting = starting && selectedPlan === planKey;
                
                return (
                  <div
                    key={planKey}
                    className={cn(
                      "relative bg-white rounded-3xl p-8 transition-all duration-300 flex flex-col h-full",
                      plan.popular 
                        ? "border-2 border-slate-900 shadow-xl lg:-mt-4 lg:mb-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white" 
                        : "border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 inset-x-0 flex justify-center">
                        <span className="bg-indigo-500 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-md z-10 border border-indigo-400">
                          Most Selected
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <h3 className={cn("text-2xl font-bold tracking-tight", plan.popular ? "text-white" : "text-slate-900")}>{plan.name}</h3>
                      <p className={cn("text-[14px] mt-2", plan.popular ? "text-slate-300" : "text-slate-500")}>{plan.description}</p>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-4xl font-extrabold tracking-tight", plan.popular ? "text-white" : "text-slate-900")}>
                          {PLAN_CURRENCY}{price}
                        </span>
                        <span className={cn("text-[15px] font-medium", plan.popular ? "text-slate-400" : "text-slate-500")}>
                          {period}
                        </span>
                      </div>
                      <p className={cn("text-[13px] font-medium mt-2 flex items-center gap-1.5", plan.popular ? "text-emerald-400" : "text-emerald-600")}>
                         {isFirstDomain ? <><Zap className="w-3.5 h-3.5 fill-current" /> Free Trial + {PLAN_CURRENCY} 0 checkout</> : `${PLAN_CURRENCY} ${price}${period} upfront billing`}
                      </p>
                    </div>

                    <div className="flex-1">
                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className={cn(
                              "mt-0.5 rounded-full p-0.5 shrink-0", 
                              plan.popular ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-50 text-indigo-600"
                            )}>
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </div>
                            <span className={cn("text-[14px] leading-snug font-medium", plan.popular ? "text-slate-300" : "text-slate-600")}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={cn(
                      "mb-6 rounded-xl p-4 transition-colors",
                      plan.popular ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100",
                      "border"
                    )}>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className={cn(
                          "mt-0.5 flex shrink-0 items-center justify-center rounded border h-5 w-5 transition-colors",
                          addonSelected 
                            ? plan.popular ? "bg-indigo-500 border-indigo-500" : "bg-indigo-600 border-indigo-600"
                            : plan.popular ? "border-slate-600 group-hover:border-slate-500" : "border-slate-300 bg-white group-hover:border-slate-400"
                        )}>
                          {addonSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={addonSelected}
                            onChange={(e) => setAddonChoiceByPlan((prev) => ({ ...(prev || {}), [planKey]: e.target.checked }))}
                            disabled={starting}
                          />
                        </div>
                        <div>
                          <p className={cn("text-[14px] font-semibold", plan.popular ? "text-white" : "text-slate-900")}>
                            White-label Addon
                          </p>
                          <p className={cn("text-[12px] mt-1 leading-relaxed", plan.popular ? "text-slate-400" : "text-slate-500")}>
                            Remove branding. <strong className={plan.popular ? "text-slate-300" : "text-slate-700"}>14 Days Free, then +{PLAN_CURRENCY}{tab === "monthly" ? ADDON_BRANDING_PRICE_EUR : ADDON_BRANDING_PRICE_EUR * 10}{period}</strong>
                          </p>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={() => handlePlanSelect(planKey)}
                      disabled={starting}
                      className={cn(
                        "w-full py-4 text-[15px] font-bold tracking-wide rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group",
                        starting && !isStarting 
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                          : plan.popular 
                            ? "bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-indigo-500/25 hover:shadow-lg"
                            : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg"
                      )}
                    >
                      {isStarting ? <><Loader2 className="w-5 h-5 animate-spin mr-1" /> Initializing...</> : isFirstDomain ? "Initialize 14-day Trial" : `Deploy Instance`}
                      {!starting && <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {domain && !siteId && !crawlError && loading === false && (
          <div className="text-center py-12 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
             <p className="text-[14px] font-bold text-slate-600 tracking-wide uppercase">Pre-provisioning resources...</p>
          </div>
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
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
          </div>
        </DashboardLayout>
      }
    >
      <StartTrialContent />
    </Suspense>
  );
}
