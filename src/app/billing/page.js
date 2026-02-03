"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
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
        // Store user trial info if available
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
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (siteId, immediately = false) => {
    const message = immediately
      ? "Are you sure you want to cancel immediately? You will lose access right away."
      : "Are you sure you want to cancel? You will have access until the end of your current period.";

    if (!confirm(message)) return;

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          siteId: siteId,
          cancelAtPeriodEnd: !immediately,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error || "Failed to cancel subscription");
      }
    } catch (err) {
      alert("An error occurred");
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
        <p className="text-gray-500 mt-1">Manage your domain subscriptions and billing. All plans include a <strong>14-day free trial</strong>.</p>
      </div>

      {/* 14-day trial info banner */}
      <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-green-700">14</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">14-day free trial on every plan</h3>
            <p className="text-sm text-green-800 mt-0.5">
              You get 14 days free when you add a domain. No charge until the trial ends. Same 14-day trial in Paddle checkout.
            </p>
          </div>
        </div>
      </div>

      {/* User Trial Banner - when trial is active */}
      {userTrialActive && userTrialDaysLeft !== null && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Your 14-day free trial is active</h3>
              <p className="text-sm text-blue-700">
                {userTrialDaysLeft > 0
                  ? `${userTrialDaysLeft} day${userTrialDaysLeft !== 1 ? 's' : ''} remaining`
                  : 'Your trial ends today'}
                {userTrialEndAt && (
                  <span className="ml-2">
                    (ends {new Date(userTrialEndAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-2">Active Subscriptions</p>
          <p className="text-3xl font-bold text-gray-900">{activeSubscriptions.length}</p>
          <p className="text-sm text-gray-500 mt-1">across {sites.length} domains</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-2">Monthly Total</p>
          <p className="text-3xl font-bold text-gray-900">${totalMonthly}</p>
          <p className="text-sm text-gray-500 mt-1">billed monthly</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-2">Next Billing</p>
          <p className="text-3xl font-bold text-gray-900">
            {activeSubscriptions.length > 0 ? "Various" : "—"}
          </p>
          <p className="text-sm text-gray-500 mt-1">per domain renewal</p>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Domain Subscriptions</h2>
          <p className="text-sm text-gray-500">Each domain has its own subscription</p>
        </div>

        {subscriptions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {subscriptions.map((sub) => {
              const plan = sub.subscription?.plan || "basic";
              const planDetails = PLAN_DETAILS[plan];
              const status = sub.subscription?.status?.toLowerCase();
              const isTrial = status === "trial";
              const isActive = sub.isActive;
              const cancelAtPeriodEnd = sub.subscription?.cancelAtPeriodEnd;

              return (
                <div key={sub.siteId} className="px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{sub.domain}</h3>
                        {(isTrial || userTrialActive) && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {userTrialActive
                              ? `User Trial: ${userTrialDaysLeft || 0} days left`
                              : `Trial: ${sub.trialDaysLeft || 0} days left`}
                          </span>
                        )}
                        {isActive && !isTrial && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            Active
                          </span>
                        )}
                        {cancelAtPeriodEnd && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                            Cancels Soon
                          </span>
                        )}
                        {!isActive && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>
                          <strong className="text-gray-900">{planDetails?.name}</strong> Plan
                        </span>
                        <span>
                          ${planDetails?.price}/{sub.subscription?.billingInterval === "yearly" ? "year" : "month"}
                        </span>
                        <span>
                          {planDetails?.pageViews === Infinity
                            ? "Unlimited"
                            : planDetails?.pageViews?.toLocaleString()}{" "}
                          page views
                        </span>
                      </div>

                      {sub.subscription?.currentPeriodEnd && (
                        <p className="text-sm text-gray-500 mt-2">
                          {cancelAtPeriodEnd ? "Access until" : "Renews on"}:{" "}
                          {new Date(sub.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/plans?siteId=${sub.siteId}&domain=${encodeURIComponent(sub.domain)}`}
                        className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Change Plan
                      </Link>
                      {isActive && !cancelAtPeriodEnd && (
                        <button
                          onClick={() => handleCancelSubscription(sub.siteId)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No subscriptions yet</h3>
            <p className="text-gray-500 text-sm mb-4">Add a domain and select a plan to get started</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Domain
            </Link>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
          <p className="text-sm text-gray-500">All plans include a <strong>14-day free trial</strong>. Compare and upgrade below.</p>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(PLAN_DETAILS).map(([key, plan]) => (
              <div
                key={key}
                className={`border rounded-xl p-6 ${key === "starter" ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200"
                  }`}
              >
                {key === "starter" && (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded mb-3">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm font-medium text-green-600 mb-4">14 days free, then ${plan.price}/month</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckIcon />1 domain
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckIcon />
                    {plan.pageViews === Infinity ? "Unlimited" : plan.pageViews.toLocaleString()} page views
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckIcon /><strong>14-day free trial</strong> — $0 to start
                  </li>
                </ul>
                <Link
                  href="/plans"
                  className={`block text-center py-2 text-sm font-medium rounded-lg transition-colors ${key === "starter"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Select Plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertIcon />
            <h2 className="text-lg font-semibold text-red-800">Danger Zone</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Cancel All Subscriptions</h3>
              <p className="text-sm text-gray-500">
                This will cancel all your domain subscriptions. Your domains will lose access at the end of their billing periods.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to cancel ALL subscriptions?")) {
                  subscriptions.forEach((sub) => {
                    if (sub.isActive) {
                      handleCancelSubscription(sub.siteId);
                    }
                  });
                }
              }}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              disabled={activeSubscriptions.length === 0}
            >
              Cancel All
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function BillingPage() {
  return <BillingContent />;
}
