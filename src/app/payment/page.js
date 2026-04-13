"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ADDON_BRANDING_PRICE_EUR, PLAN_DETAILS, PLAN_CURRENCY } from "@/lib/paddle";
import { ShieldCheck, CheckCircle2, Search, Zap, Loader2, ArrowLeft, Globe, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const siteId = searchParams.get("siteId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [includeBrandingAddon, setIncludeBrandingAddon] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && typeof window !== 'undefined') {
      const storedSubscriptionId = sessionStorage.getItem('paddle_subscription_id');
      const storedRedirectUrl = sessionStorage.getItem('paddle_redirect_url');

      if (storedSubscriptionId && storedRedirectUrl) {
        sessionStorage.removeItem('paddle_subscription_id');
        sessionStorage.removeItem('paddle_transaction_id');
        sessionStorage.removeItem('paddle_site_id');
        sessionStorage.removeItem('paddle_redirect_url');
        sessionStorage.removeItem('paddle_return_url');
        router.push(storedRedirectUrl);
        return;
      }
    }
  }, [status, router]);

  useEffect(() => {
    if (session && plan && ["basic", "starter", "pro"].includes(plan) && !orderData && !loading) {
      createOrder();
    }
  }, [session, plan, siteId]);

  const createOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, siteId, addons: { removeBranding: includeBrandingAddon } }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsRefresh) {
          await update();
          setTimeout(() => window.location.reload(), 500);
          return;
        }
        setError(data.error || "Failed to initiate payment handshake");
        setLoading(false);
        return;
      }

      if (data.requiresPaymentSetup || data.subscriptionId || data.subscriptionAuthUrl || data.checkoutUrl) {
        await update();

        let checkoutUrl = data.checkoutUrl || data.subscriptionAuthUrl;

        if (checkoutUrl && checkoutUrl.includes(window.location.origin)) {
          const transactionId = data.transactionId || checkoutUrl.match(/_ptxn=([^&]+)/)?.[1];
          if (transactionId) checkoutUrl = `/checkout?_ptxn=${transactionId}`;
        }

        if (!checkoutUrl && data.subscriptionId) {
          try {
            const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
            if (authResponse.ok) {
              const authData = await authResponse.json();
              if (authData.authUrl) checkoutUrl = authData.authUrl;
            }
          } catch (err) { }
        }

        if (checkoutUrl) {
          if (data.transactionId) sessionStorage.setItem('paddle_transaction_id', data.transactionId);
          if (data.subscriptionId) sessionStorage.setItem('paddle_subscription_id', data.subscriptionId);
          if (data.siteId) {
            sessionStorage.setItem('paddle_site_id', data.siteId);
            sessionStorage.setItem('paddle_redirect_url', `/dashboard/domains?payment=success&siteId=${data.siteId}`);
          }
          if (data.returnUrl) sessionStorage.setItem('paddle_return_url', data.returnUrl);

          window.location.href = checkoutUrl;
          return;
        }

        setOrderData({
          subscription: true,
          requiresPaymentSetup: true,
          subscriptionId: data.subscriptionId,
          plan: plan,
          domain: data.domain,
          siteId: data.siteId,
          ...data
        });
        setLoading(false);
        return;
      }

      if ((data.trial && data.success) || (data.subscription && data.success)) {
        await update();
        if (data.subscriptionId) {
          try {
            const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
            if (authResponse.ok) {
              const authData = await authResponse.json();
              if (authData.authUrl) {
                window.open(authData.authUrl, '_blank');
                setLoading(false);
                return;
              }
            }
          } catch (err) { }
        }
        setOrderData({ trial: data.trial, subscription: data.subscription, ...data });
        return;
      }

      if (data.success && data.subscriptionId && !data.amount) {
        try {
          const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.authUrl) {
              window.open(authData.authUrl, '_blank');
              setLoading(false);
              return;
            }
          }
        } catch (err) { }

        setOrderData({
          subscription: true,
          requiresPaymentSetup: true,
          subscriptionId: data.subscriptionId,
          plan: plan,
          domain: data.domain,
          siteId: data.siteId,
          ...data
        });
        setLoading(false);
        return;
      }

      setOrderData(data);
    } catch (err) {
      setError(err.message || "A secure connection could not be established");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !plan || !["basic", "starter", "pro"].includes(plan)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-4">
        <Search className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Invalid Subscription Request</h1>
        <Button variant="link" asChild className="text-indigo-600">
          <Link href="/plans"><ArrowLeft className="w-4 h-4 mr-2" /> Return to Plans</Link>
        </Button>
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-4">
        <Globe className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Workspace Required</h1>
        <p className="text-[14px] text-slate-500 mb-6 font-medium">Please select a domain to apply the subscription to.</p>
        <Button asChild className="rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
          <Link href="/dashboard/domains">Go to Infrastructure</Link>
        </Button>
      </div>
    );
  }

  const planNames = Object.fromEntries(Object.entries(PLAN_DETAILS).map(([k, v]) => [k, v.name]));
  const planPrices = Object.fromEntries(Object.entries(PLAN_DETAILS).map(([k, v]) => [k, `${PLAN_CURRENCY}${v.price}`]));

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 mb-6">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Confirm Subscription</h1>
          <p className="text-[15px] font-medium text-slate-500">
            Secure checkout powered by Paddle
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 pb-0">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div>
                <p className="text-[13px] font-bold tracking-widest uppercase text-indigo-600 mb-1">Selected Tier</p>
                <h3 className="text-2xl font-bold text-slate-900">{planNames[plan]} Plan</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{planPrices[plan]}</span>
                <span className="block text-[13px] font-medium text-slate-500 mt-1">/ month</span>
              </div>
            </div>

            <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className={cn(
                  "mt-0.5 flex shrink-0 items-center justify-center rounded border h-5 w-5 transition-colors",
                  includeBrandingAddon
                    ? "bg-indigo-600 border-indigo-600"
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                )}>
                  {includeBrandingAddon && <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={3} />}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={includeBrandingAddon}
                    onChange={(e) => setIncludeBrandingAddon(e.target.checked)}
                  />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-900">White-label UI Addon</p>
                  <p className="text-[13px] font-medium text-slate-500 mt-1 leading-relaxed">
                    Remove all ConsentFlow branding from your public banner.
                    <strong className="text-slate-900 block mt-1">+{PLAN_CURRENCY}{ADDON_BRANDING_PRICE_EUR}/mo</strong>
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="px-8 pb-8">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-6 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium text-rose-700 leading-snug">{error}</p>
              </div>
            )}

            {!orderData && !error && (
              <Button disabled className="w-full h-14 text-[16px] font-bold tracking-wide rounded-xl bg-slate-900 text-white shadow-md">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Connecting to Gateway...
              </Button>
            )}

            {orderData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {orderData.requiresPaymentSetup || (orderData.subscription && !orderData.amount) ? (
                  <>
                    <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-[13px] font-medium text-amber-800 leading-relaxed text-center">
                        Please attach a secure payment method to authorize the subscription. You will be redirected to our Merchant of Record, Paddle.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          if (orderData.subscriptionAuthUrl) {
                            window.open(orderData.subscriptionAuthUrl, '_blank');
                          } else if (orderData.subscriptionId) {
                            const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${orderData.subscriptionId}`);
                            const authData = await authResponse.json();
                            if (authData.authUrl) window.open(authData.authUrl, '_blank');
                          }
                        } catch (err) {
                          setError("Gateway rejected the session. Please retry.");
                        }
                      }}
                      className="w-full h-14 text-[16px] font-bold tracking-wide rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    >
                      Enter Billing Details
                    </Button>
                  </>
                ) : orderData.trial ? (
                  <div className="text-center p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Free Trial Activated</h2>
                    <p className="text-[14px] font-medium text-slate-600 mb-6">Your 14-day trial has commenced instantly.</p>
                    <Button asChild className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold tracking-wide">
                      <Link href="/dashboard">Return to Dashboard</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Button disabled className="w-full h-14 text-[16px] font-bold tracking-wide rounded-xl bg-slate-100 text-slate-500 shadow-none border border-slate-200">
                      Please resolve gateway hold
                    </Button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[12px] font-medium text-slate-400 text-center mt-6 mx-auto max-w-sm flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Data protected by 256-bit SSL encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}