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
  const transactionId = searchParams.get("transaction_id");
  const redirectParam = searchParams.get("redirect");
  const addonParam = searchParams.get("addon");
  const [checking, setChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Checking payment status...");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Try to get subscription/transaction ID from URL params, sessionStorage, or query params
    const urlSubscriptionId = subscriptionId || transactionId;
    const storedSubscriptionId = typeof window !== 'undefined' ? (sessionStorage.getItem('paddle_subscription_id') || sessionStorage.getItem('paddle_transaction_id')) : null;
    const finalSubscriptionId = urlSubscriptionId || storedSubscriptionId;
    const fallbackRedirect = redirectParam || "/dashboard/usage?payment=success";
    const siteIdFromUrl = searchParams.get("siteId");
    const siteIdFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('paddle_site_id') : null;
    const transactionIdFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('paddle_transaction_id') : null;
    const effectiveTransactionId = transactionId || transactionIdFromStorage;
    const effectiveSiteId = siteIdFromUrl || siteIdFromStorage;

    // Add-on purchase return: redirect to banner with success
    if (addonParam === "remove_branding" && redirectParam) {
      setStatusMessage("✅ Add-on purchased! Branding will be hidden on your banner.");
      setChecking(false);
      setRedirecting(true);
      setTimeout(() => router.push(redirectParam), 1500);
      return;
    }

    if (!session || !finalSubscriptionId) {
      // No subscription ID, check sessionStorage for redirect info
      if (typeof window !== 'undefined') {
        const storedRedirectUrl = sessionStorage.getItem('paddle_redirect_url');
        if (storedRedirectUrl) {
          sessionStorage.removeItem('paddle_subscription_id');
          sessionStorage.removeItem('paddle_transaction_id');
          sessionStorage.removeItem('paddle_site_id');
          sessionStorage.removeItem('paddle_redirect_url');
          sessionStorage.removeItem('paddle_return_url');
          setTimeout(() => {
            router.push(storedRedirectUrl);
          }, 1000);
          return;
        }
      }
      // Fallback: redirect to usage
      setTimeout(() => {
        router.push("/dashboard/usage");
      }, 2000);
      return;
    }

    // Check subscription status
    const checkSubscription = async () => {
      try {
        // Pending-domain checkout: confirm payment so the domain is added even if the webhook didn't fire.
        // Use transaction ID from URL or sessionStorage (Paddle often redirects without our query params).
        if (effectiveTransactionId) {
          setStatusMessage("Confirming your domain...");
          try {
            const confirmResponse = await fetch("/api/payment/confirm-pending-domain", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: effectiveTransactionId,
                ...(effectiveSiteId ? { siteId: effectiveSiteId } : {}),
              }),
            });
            const confirmData = await confirmResponse.json();
            if (confirmResponse.ok && confirmData.success && confirmData.site) {
              setStatusMessage("✅ Payment successful! Your domain has been added.");
              setRedirecting(true);
              await update();
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("paddle_subscription_id");
                sessionStorage.removeItem("paddle_transaction_id");
                sessionStorage.removeItem("paddle_site_id");
                sessionStorage.removeItem("paddle_redirect_url");
                sessionStorage.removeItem("paddle_return_url");
              }
              const target = `/dashboard/usage?payment=success&siteId=${confirmData.site.siteId}`;
              setTimeout(() => {
                if (window.opener && !window.opener.closed) {
                  try {
                    window.opener.location.href = target;
                    window.close();
                    return;
                  } catch (e) {}
                }
                router.push(target);
              }, 800);
              setChecking(false);
              return;
            }
            if (confirmResponse.status === 404) {
              // Not a pending-domain flow (e.g. existing site subscription) – continue to sync-subscription below
            }
          } catch (confirmErr) {
            console.error("[Return] confirm-pending-domain error:", confirmErr);
          }
        }

        setStatusMessage("Syncing subscription status from Paddle...");
        
        // Use the final subscription ID (from URL or sessionStorage)
        const subIdToCheck = finalSubscriptionId;
        
        // First, sync subscription status directly from Paddle
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
            
            // Check if subscription is active or trial (both mean user has access)
            const subscriptionStatus = syncData.subscription?.status?.toLowerCase();
            if (syncData.subscription && (subscriptionStatus === "active" || subscriptionStatus === "trial")) {
              setStatusMessage("✅ Payment successful! Your subscription is now active.");
              setRedirecting(true);
              
              // Refresh session to get updated subscription data
              await update();
              
              // Clear sessionStorage
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('paddle_subscription_id');
                sessionStorage.removeItem('paddle_transaction_id');
                sessionStorage.removeItem('paddle_site_id');
                sessionStorage.removeItem('paddle_redirect_url');
                sessionStorage.removeItem('paddle_return_url');
              }
              
              // Redirect and close Paddle tab if possible
              setTimeout(() => {
                const siteId = syncData.site?.siteId || siteIdFromUrl;
                const target = siteId ? `/dashboard/usage?payment=success&siteId=${siteId}` : fallbackRedirect;
                if (typeof window !== "undefined") {
                  if (window.opener && !window.opener.closed) {
                    try {
                      window.opener.location.href = target;
                      window.close();
                      return;
                    } catch (e) {
                      // Fallback to same-tab redirect
                    }
                  }
                }
                router.push(target);
              }, 800);
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
            (sub) => sub.subscription?.paddleSubscriptionId === subIdToCheck
          )?.subscription;

          const subscriptionStatus = subscription?.status?.toLowerCase();
          if (subscription && (subscriptionStatus === "active" || subscriptionStatus === "trial")) {
            setStatusMessage("✅ Payment successful! Your subscription is now active.");
            setRedirecting(true);
            
            // Refresh session to get updated subscription data
            await update();
            
            // Clear sessionStorage
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('paddle_subscription_id');
              sessionStorage.removeItem('paddle_site_id');
              sessionStorage.removeItem('paddle_redirect_url');
              sessionStorage.removeItem('paddle_return_url');
            }
            
            // Redirect and close Paddle tab if possible
            setTimeout(() => {
              const siteId = subscription.siteId || data.siteId || siteIdFromUrl;
              const target = siteId ? `/dashboard/usage?payment=success&siteId=${siteId}` : fallbackRedirect;
              if (typeof window !== "undefined") {
                if (window.opener && !window.opener.closed) {
                  try {
                    window.opener.location.href = target;
                    window.close();
                    return;
                  } catch (e) {
                    // Fallback to same-tab redirect
                  }
                }
              }
              router.push(target);
            }, 800);
          } else {
            // Subscription might still be pending, try syncing again with polling
            setStatusMessage("Payment completed! Syncing subscription status...");
            
            // Poll for subscription activation by syncing from Paddle
            let attempts = 0;
            const maxAttempts = 10;
            const pollInterval = setInterval(async () => {
              attempts++;
              
              try {
                // Try syncing from Paddle
                const syncResponse = await fetch("/api/payment/sync-subscription", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ subscriptionId: subIdToCheck }),
                });

                if (syncResponse.ok) {
                  const syncData = await syncResponse.json();
                  const subscriptionStatus = syncData.subscription?.status?.toLowerCase();
                  // Check if subscription is active or trial (both mean user has access)
                  if (syncData.subscription && (subscriptionStatus === "active" || subscriptionStatus === "trial")) {
                    clearInterval(pollInterval);
                    setStatusMessage("✅ Payment successful! Your subscription is now active.");
                    setRedirecting(true);
                    await update();
                    
                    // Clear sessionStorage
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('paddle_subscription_id');
                      sessionStorage.removeItem('paddle_transaction_id');
                      sessionStorage.removeItem('paddle_site_id');
                      sessionStorage.removeItem('paddle_redirect_url');
                      sessionStorage.removeItem('paddle_return_url');
                    }
                    
                    setTimeout(() => {
                      const siteId = syncData.site?.siteId || siteIdFromUrl;
                      const target = siteId ? `/dashboard/usage?payment=success&siteId=${siteId}` : fallbackRedirect;
                      if (typeof window !== "undefined") {
                        if (window.opener && !window.opener.closed) {
                          try {
                            window.opener.location.href = target;
                            window.close();
                            return;
                          } catch (e) {
                            // Fallback to same-tab redirect
                          }
                        }
                      }
                      router.push(target);
                    }, 800);
                    setChecking(false);
                    return;
                  }
                }
                
                // Fallback: check our database
                const pollResponse = await fetch(`/api/subscription?subscriptionId=${subIdToCheck}`);
                if (pollResponse.ok) {
                  const pollData = await pollResponse.json();
                  const pollSubscription = pollData.subscriptions?.find(
            (sub) => {
              const subData = sub.subscription;
              return subData?.paddleSubscriptionId === subIdToCheck || 
                     subData?.paddleTransactionId === subIdToCheck ||
                     subIdToCheck === subData?.paddleSubscriptionId ||
                     subIdToCheck === subData?.paddleTransactionId;
            }
                  )?.subscription;

                  const pollStatus = pollSubscription?.status?.toLowerCase();
                  if (pollSubscription && (pollStatus === "active" || pollStatus === "trial")) {
                    clearInterval(pollInterval);
                    setStatusMessage("✅ Payment successful! Your subscription is now active.");
                    setRedirecting(true);
                    await update();
                    
                    // Clear sessionStorage
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('paddle_subscription_id');
                      sessionStorage.removeItem('paddle_site_id');
                      sessionStorage.removeItem('paddle_redirect_url');
                      sessionStorage.removeItem('paddle_return_url');
                    }
                    
                    setTimeout(() => {
                      const siteId = pollSubscription.siteId || pollData.siteId || siteIdFromUrl;
                      const target = siteId ? `/dashboard/usage?payment=success&siteId=${siteId}` : fallbackRedirect;
                      if (typeof window !== "undefined") {
                        if (window.opener && !window.opener.closed) {
                          try {
                            window.opener.location.href = target;
                            window.close();
                            return;
                          } catch (e) {
                            // Fallback to same-tab redirect
                          }
                        }
                      }
                      router.push(target);
                    }, 800);
                  } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setStatusMessage("Payment received! Your subscription will be activated shortly. Redirecting...");
                    setRedirecting(true);
                    await update();
                    
                    // Clear sessionStorage
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('paddle_subscription_id');
                      sessionStorage.removeItem('paddle_site_id');
                      sessionStorage.removeItem('paddle_redirect_url');
                      sessionStorage.removeItem('paddle_return_url');
                    }
                    
                    setTimeout(() => {
                      if (typeof window !== "undefined") {
                        if (window.opener && !window.opener.closed) {
                          try {
                            window.opener.location.href = fallbackRedirect;
                            window.close();
                            return;
                          } catch (e) {
                            // Fallback to same-tab redirect
                          }
                        }
                      }
                      router.push(fallbackRedirect);
                    }, 1200);
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
                    sessionStorage.removeItem('paddle_subscription_id');
                    sessionStorage.removeItem('paddle_site_id');
                    sessionStorage.removeItem('paddle_redirect_url');
                    sessionStorage.removeItem('paddle_return_url');
                  }
                  
                  setTimeout(() => {
                    if (typeof window !== "undefined") {
                      if (window.opener && !window.opener.closed) {
                        try {
                          window.opener.location.href = fallbackRedirect;
                          window.close();
                          return;
                        } catch (e) {
                          // Fallback to same-tab redirect
                        }
                      }
                    }
                    router.push(fallbackRedirect);
                  }, 1200);
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
                  sessionStorage.removeItem('paddle_subscription_id');
                  sessionStorage.removeItem('paddle_site_id');
                  sessionStorage.removeItem('paddle_redirect_url');
                  sessionStorage.removeItem('paddle_return_url');
                }
                
                router.push(fallbackRedirect);
              }
            }, 30000);
          }
        } else {
          // API error, still redirect to profile
          setStatusMessage("Payment completed! Redirecting to usage...");
          setRedirecting(true);
          await update();
          
          // Clear sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('paddle_subscription_id');
            sessionStorage.removeItem('paddle_site_id');
            sessionStorage.removeItem('paddle_redirect_url');
            sessionStorage.removeItem('paddle_return_url');
          }
          
          setTimeout(() => {
            if (typeof window !== "undefined") {
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.location.href = fallbackRedirect;
                  window.close();
                  return;
                } catch (e) {
                  // Fallback to same-tab redirect
                }
              }
            }
            router.push(fallbackRedirect);
          }, 1200);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setStatusMessage("Payment completed! Redirecting to usage...");
        setRedirecting(true);
        
        // Clear sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('paddle_subscription_id');
          sessionStorage.removeItem('paddle_site_id');
          sessionStorage.removeItem('paddle_redirect_url');
          sessionStorage.removeItem('paddle_return_url');
        }
        
        setTimeout(() => {
          if (typeof window !== "undefined") {
            if (window.opener && !window.opener.closed) {
              try {
                window.opener.location.href = fallbackRedirect;
                window.close();
                return;
              } catch (e) {
                // Fallback to same-tab redirect
              }
            }
          }
          router.push(fallbackRedirect);
        }, 1200);
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
            <p className="text-sm text-gray-500">Redirecting to usage...</p>
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
              href="/dashboard/usage"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Usage
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
