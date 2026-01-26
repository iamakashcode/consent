"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function PaymentReturnContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get("subscription_id") || searchParams.get("subscriptionId");
  const [checking, setChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Checking payment status...");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Try to get subscription ID from URL params, sessionStorage, or query params
    const urlSubscriptionId = subscriptionId;
    const storedSubscriptionId = typeof window !== 'undefined' ? sessionStorage.getItem('razorpay_subscription_id') : null;
    const finalSubscriptionId = urlSubscriptionId || storedSubscriptionId;

    if (!session || !finalSubscriptionId) {
      // No subscription ID, check sessionStorage for redirect info
      if (typeof window !== 'undefined') {
        const storedRedirectUrl = sessionStorage.getItem('razorpay_redirect_url');
        if (storedRedirectUrl) {
          sessionStorage.removeItem('razorpay_subscription_id');
          sessionStorage.removeItem('razorpay_site_id');
          sessionStorage.removeItem('razorpay_redirect_url');
          sessionStorage.removeItem('razorpay_return_url');
          setTimeout(() => {
            router.push(storedRedirectUrl);
          }, 1000);
          return;
        }
      }
      // Fallback: redirect to profile
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
      return;
    }

    // Check subscription status
    const checkSubscription = async () => {
      try {
        setStatusMessage("Syncing subscription status from Razorpay...");
        
        // Use the final subscription ID (from URL or sessionStorage)
        const subIdToCheck = finalSubscriptionId;
        
        // First, sync subscription status directly from Razorpay
        try {
          const syncResponse = await fetch("/api/payment/sync-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ subscriptionId: subIdToCheck }),
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log("[Return] Synced subscription:", syncData);
            
            if (syncData.subscription && syncData.subscription.status === "active") {
              setStatusMessage("✅ Payment successful! Your subscription is now active.");
              setRedirecting(true);
              
              // Refresh session to get updated subscription data
              await update();
              
              // Clear sessionStorage
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('razorpay_subscription_id');
                sessionStorage.removeItem('razorpay_site_id');
                sessionStorage.removeItem('razorpay_redirect_url');
                sessionStorage.removeItem('razorpay_return_url');
              }
              
              // Redirect to profile with success message
              setTimeout(() => {
                const siteId = syncData.site?.siteId || searchParams.get("siteId");
                if (siteId) {
                  router.push(`/profile?payment=success&siteId=${siteId}`);
                } else {
                  router.push("/profile?payment=success");
                }
              }, 1500);
              setChecking(false);
              return;
            }
          }
        } catch (syncError) {
          console.error("[Return] Error syncing subscription:", syncError);
          // Continue to fallback check
        }

        // Fallback: Check subscription from our API
        setStatusMessage("Verifying subscription status...");
        const response = await fetch(`/api/subscription?subscriptionId=${subIdToCheck}`);
        if (response.ok) {
          const data = await response.json();
          
          // Check if subscription is active
          const subscription = data.subscriptions?.find(
            (sub) => sub.subscription?.razorpaySubscriptionId === subIdToCheck
          )?.subscription;

          if (subscription && subscription.status === "active") {
            setStatusMessage("✅ Payment successful! Your subscription is now active.");
            setRedirecting(true);
            
            // Refresh session to get updated subscription data
            await update();
            
            // Clear sessionStorage
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('razorpay_subscription_id');
              sessionStorage.removeItem('razorpay_site_id');
              sessionStorage.removeItem('razorpay_redirect_url');
              sessionStorage.removeItem('razorpay_return_url');
            }
            
            // Redirect to profile with success message
            setTimeout(() => {
              const siteId = subscription.siteId || data.siteId || searchParams.get("siteId");
              if (siteId) {
                router.push(`/profile?payment=success&siteId=${siteId}`);
              } else {
                router.push("/profile?payment=success");
              }
            }, 1500);
          } else {
            // Subscription might still be pending, try syncing again with polling
            setStatusMessage("Payment completed! Syncing subscription status...");
            
            // Poll for subscription activation by syncing from Razorpay
            let attempts = 0;
            const maxAttempts = 10;
            const pollInterval = setInterval(async () => {
              attempts++;
              
              try {
                // Try syncing from Razorpay
                const syncResponse = await fetch("/api/payment/sync-subscription", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ subscriptionId: subIdToCheck }),
                });

                if (syncResponse.ok) {
                  const syncData = await syncResponse.json();
                  if (syncData.subscription && syncData.subscription.status === "active") {
                    clearInterval(pollInterval);
                    setStatusMessage("✅ Payment successful! Your subscription is now active.");
                    setRedirecting(true);
                    await update();
                    
                    // Clear sessionStorage
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('razorpay_subscription_id');
                      sessionStorage.removeItem('razorpay_site_id');
                      sessionStorage.removeItem('razorpay_redirect_url');
                      sessionStorage.removeItem('razorpay_return_url');
                    }
                    
                    setTimeout(() => {
                      const siteId = syncData.site?.siteId || searchParams.get("siteId");
                      if (siteId) {
                        router.push(`/profile?payment=success&siteId=${siteId}`);
                      } else {
                        router.push("/profile?payment=success");
                      }
                    }, 1500);
                    return;
                  }
                }
                
                // Fallback: check our database
                const pollResponse = await fetch(`/api/subscription?subscriptionId=${subIdToCheck}`);
                if (pollResponse.ok) {
                  const pollData = await pollResponse.json();
                  const pollSubscription = pollData.subscriptions?.find(
                    (sub) => sub.subscription?.razorpaySubscriptionId === subIdToCheck
                  )?.subscription;

                  if (pollSubscription && pollSubscription.status === "active") {
                    clearInterval(pollInterval);
                    setStatusMessage("✅ Payment successful! Your subscription is now active.");
                    setRedirecting(true);
                    await update();
                    
                    // Clear sessionStorage
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('razorpay_subscription_id');
                      sessionStorage.removeItem('razorpay_site_id');
                      sessionStorage.removeItem('razorpay_redirect_url');
                      sessionStorage.removeItem('razorpay_return_url');
                    }
                    
                    setTimeout(() => {
                      const siteId = pollSubscription.siteId || pollData.siteId || searchParams.get("siteId");
                      if (siteId) {
                        router.push(`/profile?payment=success&siteId=${siteId}`);
                      } else {
                        router.push("/profile?payment=success");
                      }
                    }, 1500);
                  } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setStatusMessage("Payment received! Your subscription will be activated shortly. Redirecting...");
                    setRedirecting(true);
                    await update();
                    
                    // Clear sessionStorage
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('razorpay_subscription_id');
                      sessionStorage.removeItem('razorpay_site_id');
                      sessionStorage.removeItem('razorpay_redirect_url');
                      sessionStorage.removeItem('razorpay_return_url');
                    }
                    
                    setTimeout(() => {
                      router.push("/profile?payment=success");
                    }, 2000);
                  }
                }
              } catch (error) {
                console.error("Error polling subscription:", error);
                if (attempts >= maxAttempts) {
                  clearInterval(pollInterval);
                  setStatusMessage("Payment received! Redirecting to profile...");
                  setRedirecting(true);
                  
                  // Clear sessionStorage
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('razorpay_subscription_id');
                    sessionStorage.removeItem('razorpay_site_id');
                    sessionStorage.removeItem('razorpay_redirect_url');
                    sessionStorage.removeItem('razorpay_return_url');
                  }
                  
                  setTimeout(() => {
                    router.push("/profile?payment=success");
                  }, 2000);
                }
              }
            }, 2000); // Poll every 2 seconds

            // Cleanup interval after 30 seconds max
            setTimeout(() => {
              clearInterval(pollInterval);
              if (!redirecting) {
                setStatusMessage("Payment received! Redirecting to profile...");
                setRedirecting(true);
                
                // Clear sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('razorpay_subscription_id');
                  sessionStorage.removeItem('razorpay_site_id');
                  sessionStorage.removeItem('razorpay_redirect_url');
                  sessionStorage.removeItem('razorpay_return_url');
                }
                
                router.push("/profile?payment=success");
              }
            }, 30000);
          }
        } else {
          // API error, still redirect to profile
          setStatusMessage("Payment completed! Redirecting to profile...");
          setRedirecting(true);
          await update();
          
          // Clear sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('razorpay_subscription_id');
            sessionStorage.removeItem('razorpay_site_id');
            sessionStorage.removeItem('razorpay_redirect_url');
            sessionStorage.removeItem('razorpay_return_url');
          }
          
          setTimeout(() => {
            router.push("/profile?payment=success");
          }, 1500);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setStatusMessage("Payment completed! Redirecting to profile...");
        setRedirecting(true);
        
        // Clear sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('razorpay_subscription_id');
          sessionStorage.removeItem('razorpay_site_id');
          sessionStorage.removeItem('razorpay_redirect_url');
          sessionStorage.removeItem('razorpay_return_url');
        }
        
        setTimeout(() => {
          router.push("/profile?payment=success");
        }, 2000);
      } finally {
        setChecking(false);
      }
    };

    if (session && finalSubscriptionId) {
      checkSubscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, subscriptionId, router, update]);

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {redirecting ? (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">{statusMessage}</p>
            <p className="text-sm text-gray-500">Redirecting to your profile...</p>
          </>
        ) : (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-600 mb-6">{statusMessage}</p>
            <Link
              href="/profile"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Profile
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
}
