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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && plan && ["basic", "starter", "pro"].includes(plan) && !orderData && !loading) {
      createOrder();
    }
  }, [session, plan]);

  const createOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

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

      // If subscription setup is required (Basic trial or Starter/Pro subscription), redirect to Razorpay
      if (data.requiresPaymentSetup && (data.subscriptionAuthUrl || data.redirectToRazorpay)) {
        // Update session first
        await update();
        
        if (data.subscriptionAuthUrl) {
          // Redirect to Razorpay subscription authentication page
          console.log("Redirecting to Razorpay:", data.subscriptionAuthUrl);
          window.location.href = data.subscriptionAuthUrl;
          return;
        }
        
        // If no auth URL but redirect is required, fetch it
        if (data.subscriptionId) {
          try {
            const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
            const authData = await authResponse.json();
            if (authData.authUrl) {
              console.log("Fetched auth URL, redirecting:", authData.authUrl);
              window.location.href = authData.authUrl;
              return;
            }
          } catch (err) {
            console.error("Error fetching auth URL:", err);
            setError("Failed to get payment setup link. Please try again.");
            setLoading(false);
            return;
          }
        }
        
        // If we reach here, couldn't get auth URL
        setError("Failed to redirect to payment setup. Please try again.");
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
        
        // If we reach here, redirect failed - show error
        setError("Failed to redirect to payment setup. Please try again.");
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

  const handlePayment = () => {
    if (!orderData) return;

    const options = {
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Cookie Consent Manager",
      description: `Upgrade to ${plan?.charAt(0).toUpperCase() + plan?.slice(1)} Plan - ₹${orderData.amount / 100}`,
      order_id: orderData.orderId,
      handler: async function (response) {
        console.log("Razorpay payment response:", response);
        
        // Verify payment
        try {
          const payload = {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            plan: plan,
          };
          
          console.log("Sending verification request:", { ...payload, signature: payload.signature?.substring(0, 20) + "..." });
          
          const verifyResponse = await fetch("/api/payment/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const verifyData = await verifyResponse.json();

          console.log("Verification response:", { 
            status: verifyResponse.status, 
            statusText: verifyResponse.statusText,
            data: verifyData 
          });

          if (verifyResponse.ok) {
            // Update session to reflect new plan
            await update();
            // Small delay to ensure session is refreshed
            await new Promise(resolve => setTimeout(resolve, 500));
            alert("Payment successful! Your plan has been upgraded. Redirecting...");
            // Force full page reload to ensure fresh session data
            window.location.href = "/profile";
          } else {
            console.error("Verification failed:", verifyData);
            const errorMsg = verifyData.error || "Unknown error";
            console.error("Full error details:", { verifyData, response });
            alert("Payment verification failed: " + errorMsg + "\n\nCheck browser console for details.");
          }
        } catch (err) {
          console.error("Verification error:", err);
          console.error("Error stack:", err.stack);
          alert("Payment verification failed: " + (err.message || "Please contact support.") + "\n\nCheck browser console for details.");
        }
      },
      prefill: {
        email: session?.user?.email || "",
        name: session?.user?.name || "",
      },
      theme: {
        color: "#667eea",
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
    razorpay.on("payment.failed", function (response) {
      alert("Payment failed: " + response.error.description);
    });
  };

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
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => console.log("Razorpay loaded")}
      />
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
                              window.location.href = data.authUrl;
                            } else {
                              setError("Failed to get payment setup link. Please contact support.");
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
                        This is a monthly recurring subscription. You'll be charged {planPrices[plan]} every month automatically.
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
                    Redirecting to Razorpay to set up your subscription...
                  </p>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>

                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to our terms and conditions. This is a recurring monthly subscription.
                </p>
              </div>
            ) : orderData && (
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

                <button
                  onClick={handlePayment}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Pay {planPrices[plan]} & Upgrade
                </button>

                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to our terms and conditions. This is a
                  test payment using Razorpay test keys.
                </p>
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
