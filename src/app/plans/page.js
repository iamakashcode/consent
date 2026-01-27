"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: "₹5",
    period: "per month",
    description: "Perfect for getting started",
    pageViews: 100000,
    features: [
      "1 domain",
      "100,000 page views/month",
      "Basic tracker detection",
      "Cookie consent banner",
      "Community support",
      "14-day free trial",
    ],
    popular: false,
  },
  starter: {
    name: "Starter",
    price: "₹9",
    period: "per month",
    description: "For growing businesses",
    pageViews: 300000,
    features: [
      "1 domain",
      "300,000 page views/month",
      "Advanced tracker detection",
      "Customizable banner",
      "Email support",
      "Analytics dashboard",
      "14-day free trial",
    ],
    popular: true,
  },
  pro: {
    name: "Pro",
    price: "₹20",
    period: "per month",
    description: "For agencies and enterprises",
    pageViews: Infinity,
    features: [
      "1 domain",
      "Unlimited page views",
      "All tracker types",
      "White-label banner",
      "Priority support",
      "Advanced analytics",
      "API access",
      "14-day free trial",
    ],
    popular: false,
  },
};

function PlansContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const siteId = searchParams?.get("siteId") || null;
  const domain = searchParams?.get("domain") || null;

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

  const handlePlanSelect = async (planKey, billingInterval = "monthly") => {
    if (!siteId) {
      alert("Please add a domain first before selecting a plan.");
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    setSelectedPlan(planKey);

    try {
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, siteId, billingInterval }),
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
        sessionStorage.setItem("paddle_redirect_url", `/dashboard/usage?payment=success&siteId=${siteId}`);

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
          {siteId ? `Choose Plan for ${domain || "Your Domain"}` : "Choose Your Plan"}
        </h1>
        <p className="text-gray-500 mt-1">
          {siteId
            ? "Select a plan to activate consent tracking for this domain."
            : "Each domain requires its own subscription plan."}
        </p>
        {siteId && domain && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="text-sm font-medium text-indigo-700">{domain}</span>
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

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => (
          <div
            key={planKey}
            className={`relative bg-white rounded-xl p-6 border-2 transition-all ${
              plan.popular ? "border-indigo-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <h3 className="text-xl font-semibold text-gray-900 mb-1">{plan.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">or ₹{Math.round(parseInt(plan.price.replace('₹', '')) * 10)}/year</p>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <button
                onClick={() => handlePlanSelect(planKey, "monthly")}
                disabled={loading || !siteId}
                className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${
                  !siteId
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : loading && selectedPlan === planKey
                    ? "bg-gray-100 text-gray-500"
                    : plan.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {!siteId
                  ? "Add Domain First"
                  : loading && selectedPlan === planKey
                  ? "Processing..."
                  : `Select ${plan.name} (Monthly)`}
              </button>
              <button
                onClick={() => handlePlanSelect(planKey, "yearly")}
                disabled={loading || !siteId}
                className={`w-full py-2 text-xs font-medium rounded-lg transition-colors border ${
                  !siteId
                    ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                    : loading && selectedPlan === planKey
                    ? "bg-gray-50 text-gray-500 border-gray-200"
                    : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                }`}
              >
                {!siteId
                  ? "Add Domain First"
                  : loading && selectedPlan === planKey
                  ? "Processing..."
                  : `Select ${plan.name} (Yearly - Save 2 months)`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              q: "How does the trial work?",
              a: "All new users get a 14-day free trial. Your trial starts when you add your first domain. All your domains share this trial period. You won't be charged until the trial ends.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes! Cancel during the trial and you won't be charged. Cancel after and you'll have access until the end of your billing period.",
            },
            {
              q: "One subscription per domain?",
              a: "Yes, each domain needs its own subscription. However, all your domains share the same 14-day user trial period.",
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
