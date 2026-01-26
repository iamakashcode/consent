"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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
      "7-day free trial",
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
    ],
    popular: false,
  },
};

const planHierarchy = { basic: 0, starter: 1, pro: 2 };

export default function PlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const siteId = searchParams.get("siteId");
  const domain = searchParams.get("domain");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check if user returned from Razorpay payment
    if (status === "authenticated" && typeof window !== 'undefined') {
      const storedSubscriptionId = sessionStorage.getItem('razorpay_subscription_id');
      const storedSiteId = sessionStorage.getItem('razorpay_site_id');
      const storedRedirectUrl = sessionStorage.getItem('razorpay_redirect_url');
      
      // If user has payment info in sessionStorage, redirect to profile page
      if (storedSubscriptionId && storedRedirectUrl) {
        // Reset loading state first
        setLoading(false);
        
        // Clear sessionStorage
        sessionStorage.removeItem('razorpay_subscription_id');
        sessionStorage.removeItem('razorpay_site_id');
        sessionStorage.removeItem('razorpay_redirect_url');
        sessionStorage.removeItem('razorpay_return_url');
        
        // Redirect to profile page for auto-sync
        router.push(storedRedirectUrl);
        return;
      }
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Get current plan (null if no plan selected)
  let currentPlan = session.user?.plan;
  // Map legacy "free" plan to "basic"
  if (currentPlan === "free") {
    currentPlan = "basic";
  }
  const currentPlanLevel = currentPlan ? (planHierarchy[currentPlan] || 0) : -1; // -1 means no plan

  const handlePlanSelect = async (selectedPlan) => {
    // If siteId is provided, this is for a specific domain
    if (siteId) {
      setLoading(true);
      try {
        // Directly call payment API to get Razorpay redirect URL
        const response = await fetch("/api/payment/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: selectedPlan, siteId: siteId }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || "Failed to set up payment. Please try again.");
          setLoading(false);
          return;
        }

        // If we have auth URL, open Razorpay in new tab
        if (data.subscriptionAuthUrl) {
          // Store subscription ID and siteId in sessionStorage
          if (data.subscriptionId && data.siteId) {
            sessionStorage.setItem('razorpay_subscription_id', data.subscriptionId);
            sessionStorage.setItem('razorpay_site_id', data.siteId);
            sessionStorage.setItem('razorpay_redirect_url', `/profile?payment=success&siteId=${data.siteId}`);
          }
          window.open(data.subscriptionAuthUrl, '_blank');
          setLoading(false); // Reset loading state
          alert("Razorpay payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
          return;
        }

        // Try to fetch auth URL if we have subscription ID
        if (data.subscriptionId) {
          const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.authUrl) {
              // Store subscription ID and siteId in sessionStorage
              if (data.subscriptionId && data.siteId) {
                sessionStorage.setItem('razorpay_subscription_id', data.subscriptionId);
                sessionStorage.setItem('razorpay_site_id', data.siteId);
                sessionStorage.setItem('razorpay_redirect_url', `/profile?payment=success&siteId=${data.siteId}`);
              }
              window.open(authData.authUrl, '_blank');
              setLoading(false); // Reset loading state
              alert("Razorpay payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
              return;
            }
          }
        }

        // Fallback: redirect to payment page
        setLoading(false); // Reset loading state before redirect
        router.push(`/payment?plan=${selectedPlan}&siteId=${siteId}`);
      } catch (err) {
        console.error("Error selecting plan:", err);
        alert("Failed to set up payment. Please try again.");
        setLoading(false);
      }
      return;
    }

    // Legacy flow: account-level plan (should not happen with domain-based plans)
    const selectedPlanLevel = planHierarchy[selectedPlan] || 0;

    // If selecting current plan, do nothing
    if (selectedPlan === currentPlan) {
      return;
    }

    // If selecting lower plan, show message (downgrade not supported in this flow)
    if (selectedPlanLevel < currentPlanLevel) {
      alert(
        `You are currently on ${currentPlan} plan. To downgrade, please contact support.`
      );
      return;
    }

    // Allow selecting basic plan if user has no plan
    if (selectedPlan === "basic") {
      if (!currentPlan) {
        // User can select basic plan - it will start trial
        // Continue to payment flow
      } else if (currentPlan === "basic") {
        // User already has basic plan, do nothing
        return;
      }
    }

    // Navigate to payment page for the selected plan
    setLoading(true);
    if (siteId) {
      router.push(`/payment?plan=${selectedPlan}&siteId=${siteId}`);
    } else {
      router.push(`/payment?plan=${selectedPlan}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {siteId ? `Choose Plan for ${domain || 'Your Domain'}` : "Choose Your Plan"}
          </h1>
          <p className="text-xl text-gray-600">
            {siteId 
              ? "Select a plan for this domain. Each domain requires its own subscription."
              : "Select the plan that best fits your needs"
            }
          </p>
          {siteId && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
              <p className="text-sm text-blue-800">
                <strong>Domain:</strong> {domain || 'Unknown'} • <strong>Plan Required:</strong> Each domain needs its own plan
              </p>
            </div>
          )}
          {!siteId && currentPlan && (
            <p className="text-sm text-gray-500 mt-2">
              Current Plan: <span className="font-semibold text-indigo-600">{PLAN_DETAILS[currentPlan]?.name || currentPlan}</span>
            </p>
          )}
          {!siteId && !currentPlan && (
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-indigo-600">No plan selected</span> - Choose a plan to get started
            </p>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(PLAN_DETAILS).map(([planKey, plan]) => {
            const isCurrentPlan = planKey === currentPlan;
            const isUpgrade = currentPlan ? (planHierarchy[planKey] > currentPlanLevel) : true; // If no plan, all are "upgrades"
            const isDowngrade = currentPlan ? (planHierarchy[planKey] < currentPlanLevel) : false;

            return (
              <div
                key={planKey}
                className={`bg-white rounded-2xl shadow-lg p-8 relative ${
                  plan.popular
                    ? "ring-2 ring-indigo-500 scale-105"
                    : "border border-gray-200"
                } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Current Plan
                  </div>
                )}

                {plan.popular && !isCurrentPlan && (
                  <div className="bg-indigo-500 text-white text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full bg-gray-200 text-gray-600 py-3 px-6 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : isDowngrade ? (
                  <button
                    onClick={() =>
                      alert(
                        "To downgrade your plan, please contact support at support@example.com"
                      )
                    }
                    className="w-full bg-gray-100 text-gray-600 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Contact to Downgrade
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlanSelect(planKey)}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {planKey === "basic" ? "Select Basic" : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Plan Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">
                    Basic
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">
                    Starter
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-700">Page Views/Month</td>
                  <td className="text-center py-3 px-4">100,000</td>
                  <td className="text-center py-3 px-4">300,000</td>
                  <td className="text-center py-3 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-700">Tracker Detection</td>
                  <td className="text-center py-3 px-4">Basic</td>
                  <td className="text-center py-3 px-4">Advanced</td>
                  <td className="text-center py-3 px-4">All Types</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-700">Banner Customization</td>
                  <td className="text-center py-3 px-4">Standard</td>
                  <td className="text-center py-3 px-4">Customizable</td>
                  <td className="text-center py-3 px-4">White-label</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-700">Support</td>
                  <td className="text-center py-3 px-4">Community</td>
                  <td className="text-center py-3 px-4">Email</td>
                  <td className="text-center py-3 px-4">Priority</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700">Analytics</td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4">✓</td>
                  <td className="text-center py-3 px-4">Advanced</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
