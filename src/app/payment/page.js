"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";

function PaymentContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const siteId = searchParams.get("siteId"); // siteId for domain-based plans

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check if user returned from Paddle payment
    if (status === "authenticated" && typeof window !== 'undefined') {
      const storedSubscriptionId = sessionStorage.getItem('paddle_subscription_id');
      const storedRedirectUrl = sessionStorage.getItem('paddle_redirect_url');
      
      // If user has payment info in sessionStorage, redirect to profile page
      if (storedSubscriptionId && storedRedirectUrl) {
        // Clear sessionStorage
        sessionStorage.removeItem('paddle_subscription_id');
        sessionStorage.removeItem('paddle_transaction_id');
        sessionStorage.removeItem('paddle_site_id');
        sessionStorage.removeItem('paddle_redirect_url');
        sessionStorage.removeItem('paddle_return_url');
        
        // Redirect to profile page for auto-sync
        router.push(storedRedirectUrl);
        return;
      }
    }
  }, [status, router]);

  useEffect(() => {
    if (session && plan && ["basic", "starter", "pro"].includes(plan) && !orderData && !loading) {
      createOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, plan, siteId]);

  const createOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, siteId }), // Include siteId for domain-based plans
      });

      const data = await response.json();
      
      console.log("[Payment] API Response:", data);

      if (!response.ok) {
        // If session is out of sync, refresh the page
        if (data.needsRefresh) {
          // Don't show alert, just refresh - the error message is confusing
          console.log("Session out of sync, refreshing...", data);
          // Update session first, then refresh
          await update();
          setTimeout(() => {
            window.location.reload();
          }, 500);
          return;
        }
        // For other errors, show them
        setError(data.error || "Failed to create order");
        setLoading(false);
        return;
      }

      // If subscription setup is required (Basic trial or Starter/Pro subscription), redirect to Paddle
      if (data.requiresPaymentSetup || data.subscriptionId) {
        // Update session first
        await update();
        
        // Try to get auth URL from response
        let authUrl = data.subscriptionAuthUrl;
        
        // If no auth URL but we have subscriptionId, try to fetch it
        if (!authUrl && data.subscriptionId) {
          try {
            console.log("[Payment] Fetching auth URL for subscription:", data.subscriptionId);
            // Try multiple times with delays (Paddle might need time to generate the URL)
            for (let attempt = 0; attempt < 3; attempt++) {
              if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s delays
              }
              const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
              if (authResponse.ok) {
                const authData = await authResponse.json();
                console.log(`[Payment] Auth URL response (attempt ${attempt + 1}):`, authData);
                if (authData.authUrl) {
                  authUrl = authData.authUrl;
                  break;
                }
              } else {
                const errorData = await authResponse.json();
                console.warn(`[Payment] Auth URL fetch failed (attempt ${attempt + 1}):`, errorData);
              }
            }
          } catch (err) {
            console.error("[Payment] Error fetching auth URL:", err);
            // Continue to show subscription setup UI instead of error
          }
        }
        
        // If we have an auth URL, open Paddle in new tab
        if (authUrl) {
          console.log("[Payment] Opening Paddle in new tab:", authUrl);
          // Store subscription ID and siteId in sessionStorage for redirect handling
          if (data.subscriptionId && data.siteId) {
            sessionStorage.setItem('paddle_subscription_id', data.subscriptionId);
            sessionStorage.setItem('paddle_site_id', data.siteId);
            // Store return URL for manual navigation if Paddle doesn't redirect
            const returnUrl = data.returnUrl || `/payment/return?subscription_id=${data.subscriptionId}&siteId=${data.siteId}`;
            sessionStorage.setItem('paddle_return_url', returnUrl);
            sessionStorage.setItem('paddle_redirect_url', `/profile?payment=success&siteId=${data.siteId}`);
          }
          // Open Paddle in new tab
          window.open(authUrl, '_blank');
          setLoading(false); // Reset loading state
          // Show message to user
          alert("Paddle payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
          return;
        }
        
        // If we reach here, couldn't get auth URL - show subscription setup UI instead
        console.log("[Payment] No auth URL available, showing subscription setup UI");
        setOrderData({
          subscription: true,
          requiresPaymentSetup: true,
          subscriptionId: data.subscriptionId,
          subscriptionAuthUrl: authUrl || null,
          plan: plan,
          domain: data.domain,
          siteId: data.siteId,
          ...data
        });
        setLoading(false);
        return;
      }
      
      // If basic plan with trial, handle subscription setup
      if (data.trial && data.success) {
        // Update session to reflect new plan
        await update();
        
        // If we reach here, payment setup wasn't required or failed
        setOrderData({ trial: true, ...data });
        return;
      }
      
      // If subscription (Starter/Pro), handle subscription setup
      if (data.subscription && data.success) {
        // Update session to reflect new plan
        await update();
        
        // Try to get auth URL if we have subscription ID
        if (data.subscriptionId) {
          try {
            const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
            if (authResponse.ok) {
              const authData = await authResponse.json();
              if (authData.authUrl) {
                window.open(authData.authUrl, '_blank');
                setLoading(false); // Reset loading state
                alert("Paddle payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
                return;
              }
            }
          } catch (err) {
            console.error("[Payment] Error fetching auth URL:", err);
          }
        }
        
        // If we reach here, redirect failed - show subscription setup UI
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

      // If we have success but no specific handling, check if it's a subscription
      if (data.success && data.subscriptionId && !data.amount) {
        // This is a subscription, try to get auth URL
        try {
          const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.authUrl) {
              window.open(authData.authUrl, '_blank');
              setLoading(false); // Reset loading state
              alert("Paddle payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
              return;
            }
          }
        } catch (err) {
          console.error("[Payment] Error fetching auth URL:", err);
        }
        
        // Show subscription setup UI
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
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Paddle uses checkout URLs, not inline SDK handlers
  // Payment is handled via checkout URL redirect - no handlePayment function needed

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !plan || !["basic", "starter", "pro"].includes(plan)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Plan</h1>
          <Link href="/plans" className="text-indigo-600 hover:text-indigo-700">
            Go to Plans
          </Link>
        </div>
      </div>
    );
  }

  // If siteId is required but not provided, redirect back to plans
  if (!siteId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Domain Required</h1>
          <p className="text-gray-600 mb-4">Please select a domain first to choose a plan.</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const planNames = {
    basic: "Basic",
    starter: "Starter",
    pro: "Pro",
  };

  const planPrices = {
    basic: "₹5",
    starter: "₹9",
    pro: "₹20",
  };

  return (
    <>
      {/* Paddle uses checkout URLs, no SDK needed */}
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Upgrade to {planNames[plan]} Plan
              </h1>
              <p className="text-gray-600">
                Complete your payment to upgrade your subscription
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {orderData && orderData.trial ? (
              <div className="space-y-6">
                {orderData.showPaymentLink ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <div className="mb-4">
                      <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-900 mb-2">
                      Payment Setup Required
                    </h2>
                    <p className="text-yellow-800 mb-4">
                      To start your {orderData.trialDays}-day free trial, please add a payment method.
                    </p>
                    <p className="text-sm text-yellow-700 mb-4">
                      Your card will not be charged until after the trial period ends.
                    </p>
                    <button
                      onClick={() => {
                        // Fetch subscription auth URL from API
                        fetch(`/api/payment/get-subscription-auth?subscriptionId=${orderData.subscriptionId}`)
                          .then(res => res.json())
                          .then(data => {
                            if (data.authUrl) {
                              window.open(data.authUrl, '_blank');
                              setLoading(false); // Reset loading state
                              alert("Paddle payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
                            } else {
                              setError("Failed to get payment setup link. Please contact support.");
                              setLoading(false);
                            }
                          })
                          .catch(err => {
                            console.error("Error fetching auth URL:", err);
                            setError("Failed to set up payment. Please try again.");
                          });
                      }}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Add Payment Method
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <div className="mb-4">
                      <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-green-900 mb-2">
                      Free Trial Started!
                    </h2>
                    <p className="text-green-800 mb-4">
                      Your {orderData.trialDays}-day free trial for the {planNames[plan]} plan has started.
                    </p>
                    <p className="text-sm text-green-700 mb-4">
                      Trial ends on: {new Date(orderData.trialEndAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-green-600">
                      Payment of {planPrices[plan]} will be automatically deducted after the trial period ends.
                    </p>
                  </div>
                )}
                <Link
                  href="/profile"
                  className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-center"
                >
                  Go to Profile
                </Link>
              </div>
            ) : orderData && orderData.subscription ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Recurring Subscription
                      </p>
                      <p className="text-xs text-blue-700">
                        This is a monthly recurring subscription. You&apos;ll be charged {planPrices[plan]} every month automatically.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-900">
                      {planNames[plan]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Monthly Amount</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {planPrices[plan]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Billing Period</span>
                    <span className="font-semibold text-gray-900">Monthly (Recurring)</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Redirecting to Paddle to set up your subscription...
                  </p>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> After completing payment on Paddle, if you&apos;re not automatically redirected, you can manually return to your profile page. Your subscription will be activated automatically.
                  </p>
                </div>

                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to our terms and conditions. This is a recurring monthly subscription.
                </p>
              </div>
            ) : orderData && (orderData.requiresPaymentSetup || (orderData.subscription && !orderData.amount)) ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Payment Setup Required
                      </p>
                      <p className="text-xs text-blue-700">
                        Please add a payment method to activate your subscription. {plan === "basic" && "Your 7-day free trial will start after activation."}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 <strong>After completing payment on Paddle:</strong> Your subscription will be automatically synced when you return to your profile page. If you&apos;re not redirected automatically, simply navigate back to your profile page - the status will update automatically.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-900">
                      {planNames[plan]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Monthly Amount</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {planPrices[plan]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Billing Period</span>
                    <span className="font-semibold text-gray-900">Monthly (Recurring)</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      if (orderData.subscriptionAuthUrl) {
                        window.open(orderData.subscriptionAuthUrl, '_blank');
                        setLoading(false); // Reset loading state
                        alert("Paddle payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
                      } else if (orderData.subscriptionId) {
                        const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${orderData.subscriptionId}`);
                        const authData = await authResponse.json();
                        if (authData.authUrl) {
                          window.open(authData.authUrl, '_blank');
                          setLoading(false); // Reset loading state
                          alert("Paddle payment page opened in a new tab. After completing payment, return to your profile page and your subscription will be automatically synced.");
                        } else {
                          setError("Failed to get payment setup link. Please try again.");
                          setLoading(false);
                        }
                      } else {
                        setError("Payment setup link not available. Please try selecting the plan again.");
                      }
                    } catch (err) {
                      console.error("Error setting up payment:", err);
                      setError("Failed to set up payment. Please try again.");
                    }
                  }}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add Payment Method & Activate
                </button>

                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to our terms and conditions. This is a recurring monthly subscription.
                </p>
              </div>
            ) : orderData && orderData.amount ? (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-900">
                      {planNames[plan]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Amount</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {planPrices[plan]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mb-4">
                    (Amount in payment gateway: ₹{orderData.amount / 100} = {orderData.amount} paise)
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Billing Period</span>
                    <span className="font-semibold text-gray-900">Monthly</span>
                  </div>
                </div>

                {orderData.subscriptionAuthUrl ? (
                  <button
                    onClick={() => {
                      if (orderData.subscriptionAuthUrl) {
                        window.open(orderData.subscriptionAuthUrl, '_blank');
                        if (orderData.subscriptionId || orderData.transactionId) {
                          sessionStorage.setItem('paddle_subscription_id', orderData.subscriptionId || '');
                          sessionStorage.setItem('paddle_transaction_id', orderData.transactionId || '');
                          sessionStorage.setItem('paddle_site_id', siteId || '');
                          sessionStorage.setItem('paddle_redirect_url', `/dashboard/usage?payment=success&siteId=${siteId}`);
                        }
                        alert("Paddle checkout opened. After payment, return to dashboard.");
                      }
                    }}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Pay {planPrices[plan]} & Upgrade
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white py-3 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Loading checkout...
                  </button>
                )}

                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to our terms and conditions. This is a
                  test payment using Paddle test keys.
                </p>
              </div>
            ) : orderData && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-900 mb-4">
                    Unable to process payment. Please try selecting the plan again.
                  </p>
                  <Link
                    href={`/plans?siteId=${siteId}&domain=${encodeURIComponent(orderData.domain || "")}`}
                    className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Go Back to Plans
                  </Link>
                </div>
              </div>
            )}

            {!orderData && !error && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Preparing payment...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}