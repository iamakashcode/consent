"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { getRemainingTrialDays, isTrialActive, formatTrialEndDate } from "@/lib/trial-utils";

function ProfileContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [siteStats, setSiteStats] = useState({}); // Store stats for each site
  const [subscription, setSubscription] = useState(null); // Subscription details with trial info
  const [subscriptionsBySite, setSubscriptionsBySite] = useState({}); // Map of siteId -> subscription
  const hasRefreshed = useRef(false);
  const hasAutoSynced = useRef(false); // Track if we've already auto-synced on this page load
  const isAutoSyncing = useRef(false); // Track if auto-sync is currently running to prevent concurrent calls

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Check for payment success redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check URL params first
      const paymentSuccess = searchParams?.get("payment");
      const siteIdParam = searchParams?.get("siteId");
      if (paymentSuccess === "success" && session) {
        // Auto-sync subscription status from Razorpay (only if not already syncing)
        if (!isAutoSyncing.current) {
          const syncAndRefresh = async () => {
            try {
              isAutoSyncing.current = true;
              
              // First fetch current subscriptions
              await fetchSubscription();
              
              // Get all subscriptions that might need syncing
              const allSubs = Object.values(subscriptionsBySite);
              const subsToSync = siteIdParam 
                ? allSubs.filter(sub => {
                    // Match by siteId if provided
                    const site = sites.find(s => s.siteId === siteIdParam || s.id === siteIdParam);
                    return site && sub && (sub.razorpaySubscriptionId || sub.status === "pending");
                  })
                : allSubs.filter(sub => sub && (sub.razorpaySubscriptionId || sub.status === "pending"));

              // Sync each subscription
              let syncedAny = false;
              for (const sub of subsToSync) {
                if (sub && sub.razorpaySubscriptionId) {
                  try {
                    const response = await fetch("/api/payment/sync-subscription", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        subscriptionId: sub.razorpaySubscriptionId,
                        siteId: siteIdParam,
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.subscription.status === "active") {
                        syncedAny = true;
                        console.log("[Profile] Synced subscription to active:", sub.razorpaySubscriptionId);
                      }
                    }
                  } catch (error) {
                    console.error("[Profile] Error syncing subscription:", error);
                  }
                }
              }

              // Refresh all data after syncing
              await update();
              // Prevent auto-sync from running again during these fetches
              const wasAutoSyncing = isAutoSyncing.current;
              await fetchSubscription();
              await fetchSites();
              isAutoSyncing.current = wasAutoSyncing;
              
              // Show success message
              if (syncedAny) {
                setTimeout(() => {
                  alert("✅ Payment successful! Your subscription has been activated.");
                }, 500);
              } else {
                setTimeout(() => {
                  alert("✅ Payment received! Your subscription status is being updated.");
                }, 500);
              }
            } catch (error) {
              console.error("[Profile] Error in sync and refresh:", error);
              // Still show success message
              setTimeout(() => {
                alert("✅ Payment successful! Refreshing subscription status...");
              }, 500);
              await update();
              const wasAutoSyncing = isAutoSyncing.current;
              await fetchSubscription();
              await fetchSites();
              isAutoSyncing.current = wasAutoSyncing;
            } finally {
              isAutoSyncing.current = false;
            }
          };

          syncAndRefresh();
        }
        
        // Remove query parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        return;
      }
      
      // Also check sessionStorage for Razorpay redirect (user came back from Razorpay)
      const storedSubscriptionId = sessionStorage.getItem('razorpay_subscription_id');
      const storedSiteId = sessionStorage.getItem('razorpay_site_id');
      if (storedSubscriptionId && session) {
        // User returned from Razorpay - auto-sync subscription status
        const checkSubscription = async () => {
          try {
            console.log("[Profile] User returned from Razorpay, auto-syncing subscription:", storedSubscriptionId);
            
            // Prevent concurrent sync calls
            if (isAutoSyncing.current) {
              console.log("[Profile] Auto-sync already running, skipping sessionStorage sync");
              // Still clear sessionStorage
              sessionStorage.removeItem('razorpay_subscription_id');
              sessionStorage.removeItem('razorpay_site_id');
              sessionStorage.removeItem('razorpay_redirect_url');
              sessionStorage.removeItem('razorpay_return_url');
              return;
            }

            isAutoSyncing.current = true;

            // First sync from Razorpay
            const syncResponse = await fetch("/api/payment/sync-subscription", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                subscriptionId: storedSubscriptionId,
                siteId: storedSiteId,
              }),
            });

            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              console.log("[Profile] Auto-sync result:", syncData);
              
              if (syncData.success && syncData.subscription.status === "active") {
                // Refresh all data
                await update();
                // Prevent auto-sync from running again during these fetches
                const wasAutoSyncing = isAutoSyncing.current;
                await fetchSubscription();
                await fetchSites();
                isAutoSyncing.current = wasAutoSyncing;
                
                // Clear sessionStorage
                sessionStorage.removeItem('razorpay_subscription_id');
                sessionStorage.removeItem('razorpay_site_id');
                sessionStorage.removeItem('razorpay_redirect_url');
                sessionStorage.removeItem('razorpay_return_url');
                
                // Show success message
                setTimeout(() => {
                  alert("✅ Payment successful! Your subscription has been activated.");
                }, 500);
                
                // Redirect to profile with success (if we have siteId)
                if (storedSiteId) {
                  const newUrl = `/profile?payment=success&siteId=${storedSiteId}`;
                  window.history.replaceState({}, "", newUrl);
                }
              } else {
                // Subscription might still be pending, but we tried
                await update();
                const wasAutoSyncing = isAutoSyncing.current;
                await fetchSubscription();
                await fetchSites();
                isAutoSyncing.current = wasAutoSyncing;
                
                // Clear sessionStorage
                sessionStorage.removeItem('razorpay_subscription_id');
                sessionStorage.removeItem('razorpay_site_id');
                sessionStorage.removeItem('razorpay_redirect_url');
                sessionStorage.removeItem('razorpay_return_url');
                
                setTimeout(() => {
                  alert("Payment received! Your subscription status is being updated. If it doesn't update automatically, please click 'Sync Status'.");
                }, 500);
              }
            } else {
              // Sync failed, but still refresh data
              await update();
              const wasAutoSyncing = isAutoSyncing.current;
              await fetchSubscription();
              await fetchSites();
              isAutoSyncing.current = wasAutoSyncing;
              
              // Clear sessionStorage
              sessionStorage.removeItem('razorpay_subscription_id');
              sessionStorage.removeItem('razorpay_site_id');
              sessionStorage.removeItem('razorpay_redirect_url');
              sessionStorage.removeItem('razorpay_return_url');
            }

            isAutoSyncing.current = false;
          } catch (error) {
            console.error("Error checking subscription status:", error);
            // Still clear sessionStorage
            sessionStorage.removeItem('razorpay_subscription_id');
            sessionStorage.removeItem('razorpay_site_id');
            sessionStorage.removeItem('razorpay_redirect_url');
            sessionStorage.removeItem('razorpay_return_url');
          }
        };
        checkSubscription();
      }
    }
  }, [searchParams, session, update]);

  useEffect(() => {
    if (session && !hasRefreshed.current) {
      // Refresh session once on mount to ensure plan is up to date
      // This helps when admin changes the plan
      hasRefreshed.current = true;
      update();
      fetchSites();
      fetchSubscription().then(() => {
        // After fetching subscriptions, auto-sync any pending subscriptions (only once)
        // Use a small delay to ensure subscriptionsBySite state is updated
        setTimeout(() => {
          if (!hasAutoSynced.current && !isAutoSyncing.current) {
            autoSyncPendingSubscriptions();
          }
        }, 1500);
      });
    } else if (session) {
      fetchSites();
      fetchSubscription().then(() => {
        // Only auto-sync if we haven't already and not currently syncing
        // Skip auto-sync on subsequent renders to prevent loops
        if (!hasRefreshed.current) {
          setTimeout(() => {
            if (!hasAutoSynced.current && !isAutoSyncing.current) {
              autoSyncPendingSubscriptions();
            }
          }, 1500);
        }
      });
    }
  }, [session]);

  // Auto-sync pending subscriptions from Razorpay
  const autoSyncPendingSubscriptions = async () => {
    // Prevent concurrent auto-sync calls
    if (isAutoSyncing.current || hasAutoSynced.current) {
      console.log("[Profile] Auto-sync already running or completed, skipping");
      return;
    }

    // Mark as syncing
    isAutoSyncing.current = true;
    hasAutoSynced.current = true;

    try {
      // Wait a bit for subscriptionsBySite to be populated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get all pending subscriptions
      const pendingSubs = Object.values(subscriptionsBySite).filter(
        (sub) => sub && sub.status === "pending" && sub.razorpaySubscriptionId
      );

      if (pendingSubs.length === 0) {
        isAutoSyncing.current = false;
        return;
      }

      console.log("[Profile] Auto-syncing pending subscriptions:", pendingSubs.length);

      // Sync each pending subscription (only sync once per page load)
      let syncedCount = 0;
      for (const sub of pendingSubs) {
        try {
          const response = await fetch("/api/payment/sync-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscriptionId: sub.razorpaySubscriptionId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.subscription.status === "active") {
              syncedCount++;
              console.log("[Profile] Auto-synced subscription to active:", sub.razorpaySubscriptionId);
            }
          }
        } catch (error) {
          console.error("[Profile] Error auto-syncing subscription:", error);
          // Continue with other subscriptions
        }
      }

      // If any subscriptions were synced, refresh data and show message
      if (syncedCount > 0) {
        // Refresh data without triggering auto-sync again
        await update();
        // Use a flag to prevent auto-sync from running again
        const wasAutoSyncing = isAutoSyncing.current;
        await fetchSubscription();
        await fetchSites();
        // Restore the flag
        isAutoSyncing.current = wasAutoSyncing;
        
        // Show success message
        setTimeout(() => {
          alert(`✅ ${syncedCount} subscription${syncedCount > 1 ? 's' : ''} activated! Your plan${syncedCount > 1 ? 's are' : ' is'} now active.`);
        }, 500);
      }
    } catch (error) {
      console.error("[Profile] Error in auto-sync:", error);
    } finally {
      // Mark as done syncing
      isAutoSyncing.current = false;
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        console.log("[Profile] Subscription data:", data);
        // Data is now { subscriptions: [...], count: number, activeCount: number }
        // Create a map of siteId -> subscription for easy lookup
        // Map by both public siteId and database ID for flexibility
        const subscriptionsMap = {};
        if (data.subscriptions && data.subscriptions.length > 0) {
          data.subscriptions.forEach((item) => {
            if (item.subscription) {
              // Map by public siteId
              if (item.siteId) {
                subscriptionsMap[item.siteId] = item.subscription;
              }
              // Also map by database ID for matching
              if (item.siteDbId) {
                subscriptionsMap[item.siteDbId] = item.subscription;
              }
            }
          });
          // For backward compatibility, set the first subscription if exists
          const firstSub = data.subscriptions[0].subscription;
          setSubscription(firstSub); // Show first domain's subscription for trial banner
        } else {
          setSubscription(null);
        }
        setSubscriptionsBySite(subscriptionsMap);
      } else {
        console.error("[Profile] Failed to fetch subscription:", response.status, await response.text());
        setSubscription(null);
        setSubscriptionsBySite({});
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setSubscription(null);
      setSubscriptionsBySite({});
    }
  };

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/sites");
      if (response.ok) {
        const data = await response.json();
        setSites(data);
        // Fetch stats for each site
        const statsPromises = data.map(async (site) => {
          try {
            const statsResponse = await fetch(`/api/sites/${site.siteId}/stats`);
            if (statsResponse.ok) {
              const stats = await statsResponse.json();
              return { siteId: site.siteId, stats };
            }
          } catch (err) {
            console.error(`Failed to fetch stats for ${site.siteId}:`, err);
          }
          return { siteId: site.siteId, stats: null };
        });
        const statsResults = await Promise.all(statsPromises);
        const statsMap = {};
        statsResults.forEach(({ siteId, stats }) => {
          if (stats) statsMap[siteId] = stats;
        });
        setSiteStats(statsMap);
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScriptUrl = (site) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${baseUrl}/api/script/${site.siteId}?domain=${encodeURIComponent(
      site.domain
    )}`;
  };

  const copyScript = async (site) => {
    const scriptUrl = getScriptUrl(site);
    const scriptTag = `<script src="${scriptUrl}"></script>`;

    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy. Please copy manually.");
    }
  };

  const deleteSite = async (siteId) => {
    if (!confirm("Are you sure you want to delete this site? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/sites?id=${siteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSites(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete site");
      }
    } catch (err) {
      console.error("Failed to delete site:", err);
      alert("An error occurred while deleting the site");
    }
  };

  const verifyDomain = async (site) => {
    if (!site.siteId) {
      alert("Site ID not found");
      return;
    }

    setVerifyingId(site.id);
    try {
      const response = await fetch(`/api/sites/${site.siteId}/verify`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && (data.connected || data.verified)) {
        setVerificationStatus((prev) => ({
          ...prev,
          [site.id]: { verified: true, message: data.message },
        }));
        // Refresh sites to get updated connection status
        fetchSites();
        alert("Domain connected successfully! The script is now working on this domain.");
      } else {
        setVerificationStatus((prev) => ({
          ...prev,
          [site.id]: {
            verified: false,
            message: data.message || "Not connected yet",
            error: data.error,
            scriptUrl: data.scriptUrl,
          },
        }));
        
        alert(
          data.error || data.message || "Domain not connected yet. Please add the script to your website and it will verify automatically."
        );
      }
    } catch (err) {
      console.error("Failed to verify domain:", err);
      alert("An error occurred while verifying the domain");
    } finally {
      setVerifyingId(null);
    }
  };

  const getVerificationInfo = async (site) => {
    if (!site.siteId) return;

    try {
      const response = await fetch(`/api/sites/${site.siteId}/verify`);
      const data = await response.json();

      if (response.ok) {
        setVerificationStatus((prev) => ({
          ...prev,
          [site.id]: {
            verified: data.isVerified,
            token: data.verificationToken,
            scriptUrl: data.scriptUrl,
            verifiedAt: data.verifiedAt,
          },
        }));
      }
    } catch (err) {
      console.error("Failed to get verification info:", err);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Plans are now domain-based, not account-based
  // Each domain has its own subscription
  const sitesUsed = sites.length;
  
  // No account-level plan check needed - each domain has its own plan

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {session.user?.name || "User Profile"}
              </h1>
              <p className="text-gray-600">{session.user?.email}</p>
            </div>
            <div className="text-right">
              {/* Plans are per-domain, not account-level */}
              {/* Trial Countdown - Show if subscription exists and has trial */}
              {subscription && subscription.plan === "basic" && subscription.trialEndAt && isTrialActive(subscription.trialEndAt) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-left">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    🎉 Free Trial Active
                  </p>
                  <p className="text-xs text-blue-700">
                    {getRemainingTrialDays(subscription.trialEndAt)} day{getRemainingTrialDays(subscription.trialEndAt) !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Trial ends: {formatTrialEndDate(subscription.trialEndAt)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Payment of ₹5 will be deducted automatically after trial ends.
                  </p>
                </div>
              )}
              {subscription && subscription.plan === "basic" && subscription.trialEndAt && !isTrialActive(subscription.trialEndAt) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-left">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    ⚠️ Trial Expired
                  </p>
                  <p className="text-xs text-yellow-700">
                    Please complete payment to continue using the service.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-3">
                {sitesUsed} domain{sitesUsed !== 1 ? 's' : ''} added
              </p>
              <Link
                href="/plans"
                className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>

        {/* Sites List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Domains</h2>
            <Link
              href="/dashboard"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add New Domain
            </Link>
          </div>

          {sites.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No domains added yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start by adding your first domain to get a consent script
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Domain
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {sites.map((site) => {
                const scriptUrl = getScriptUrl(site);
                const scriptTag = `<script src="${scriptUrl}"></script>`;
                const trackers = Array.isArray(site.trackers)
                  ? site.trackers
                  : [];
                
                // Check if this site has an active subscription
                // Match by both public siteId and database ID
                const siteSubscription = subscriptionsBySite[site.siteId] || 
                                         subscriptionsBySite[site.id] ||
                                         Object.values(subscriptionsBySite).find(sub => {
                                           // Try to match by checking subscription's siteId against site's database ID
                                           return sub && sub.id && site.id;
                                         });
                const hasActiveSubscription = siteSubscription && siteSubscription.status === "active";
                const hasSubscription = !!siteSubscription;

                return (
                  <div
                    key={site.id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {site.domain}
                          </h3>
                      {site.isVerified ? (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                          ✓ Connected
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                          ⚠ Not Connected
                        </span>
                      )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Added on{" "}
                          {new Date(site.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {/* Show plan status */}
                        {hasActiveSubscription ? (
                          <p className="text-sm text-indigo-600 mt-1 font-semibold">
                            Plan: {siteSubscription.plan.charAt(0).toUpperCase() + siteSubscription.plan.slice(1)}
                          </p>
                        ) : hasSubscription && siteSubscription.status === "pending" ? (
                          <div className="mt-1">
                            <p className="text-sm text-yellow-600 font-semibold">
                              Plan: {siteSubscription.plan.charAt(0).toUpperCase() + siteSubscription.plan.slice(1)} (Payment Required)
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ⚠️ Subscription is not active. Please complete payment setup to activate.
                            </p>
                          </div>
                        ) : hasSubscription ? (
                          <p className="text-sm text-yellow-600 mt-1 font-semibold">
                            Plan: {siteSubscription.plan.charAt(0).toUpperCase() + siteSubscription.plan.slice(1)} ({siteSubscription.status})
                          </p>
                        ) : (
                          <p className="text-sm text-red-600 mt-1 font-semibold">
                            ⚠️ No plan selected
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Show message if no subscription */}
                    {!hasSubscription && (
                      <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-900 mb-3">
                          <strong>Plan Required:</strong> This domain needs a subscription plan to use the consent script.
                        </p>
                        <Link
                          href={`/plans?siteId=${site.siteId}&domain=${encodeURIComponent(site.domain)}`}
                          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                        >
                          Select Plan for {site.domain}
                        </Link>
                      </div>
                    )}

                    {/* Show message if subscription is pending (payment required) */}
                    {hasSubscription && siteSubscription.status === "pending" && (
                      <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-900 mb-2">
                          <strong>⚠️ Payment Required:</strong> Your subscription is not active yet. Please complete payment setup to activate your plan.
                        </p>
                        <p className="text-xs text-yellow-800 mb-3">
                          The consent script will not work until payment is completed and the subscription is activated.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setLoading(true);
                                // Directly call the payment API to get Razorpay redirect URL
                                const response = await fetch("/api/payment/create-order", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ 
                                    plan: siteSubscription.plan, 
                                    siteId: site.siteId 
                                  }),
                                });

                                const data = await response.json();
                                
                                if (!response.ok) {
                                  alert(data.error || "Failed to set up payment. Please try again.");
                                  setLoading(false);
                                  return;
                                }

                              // If we have auth URL, open Razorpay in new tab
                              if (data.subscriptionAuthUrl) {
                                window.open(data.subscriptionAuthUrl, '_blank');
                                alert("Razorpay payment page opened in a new tab. After completing payment, return to this page and your subscription will be automatically synced.");
                                return;
                              }

                              // Try to fetch auth URL if we have subscription ID
                              if (data.subscriptionId) {
                                const authResponse = await fetch(`/api/payment/get-subscription-auth?subscriptionId=${data.subscriptionId}`);
                                if (authResponse.ok) {
                                  const authData = await authResponse.json();
                                  if (authData.authUrl) {
                                    window.open(authData.authUrl, '_blank');
                                    alert("Razorpay payment page opened in a new tab. After completing payment, return to this page and your subscription will be automatically synced.");
                                    return;
                                  }
                                }
                              }

                                // Fallback: redirect to payment page
                                router.push(`/payment?plan=${siteSubscription.plan}&siteId=${site.siteId}`);
                              } catch (err) {
                                console.error("Error setting up payment:", err);
                                alert("Failed to set up payment. Please try again.");
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? "Processing..." : "Complete Payment Setup"}
                          </button>
                          {siteSubscription.razorpaySubscriptionId && (
                            <button
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  // Sync subscription status from Razorpay
                                  const response = await fetch("/api/payment/sync-subscription", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ 
                                      subscriptionId: siteSubscription.razorpaySubscriptionId,
                                      siteId: site.siteId
                                    }),
                                  });

                                  const data = await response.json();
                                  
                                  if (response.ok && data.success) {
                                    if (data.subscription.status === "active") {
                                      alert("✅ Subscription is now active! Refreshing page...");
                                      await update();
                                      await fetchSubscription();
                                      await fetchSites();
                                    } else {
                                      alert(`Subscription status: ${data.subscription.status}. If you just completed payment, please wait a moment and try again.`);
                                    }
                                  } else {
                                    alert(data.error || "Failed to sync subscription status. Please try again.");
                                  }
                                } catch (err) {
                                  console.error("Error syncing subscription:", err);
                                  alert("Failed to sync subscription status. Please try again.");
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? "Syncing..." : "🔄 Sync Status"}
                            </button>
                          )}
                        </div>
                        {siteSubscription.razorpaySubscriptionId && (
                          <p className="text-xs text-yellow-700 mt-2">
                            💡 If you just completed payment on Razorpay, click "Sync Status" to update your subscription status.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Only show details if subscription exists and is active */}
                    {hasActiveSubscription && (
                      <>
                        {trackers.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Detected Trackers:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {trackers.map((tracker, idx) => (
                                <span
                                  key={idx}
                                  className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full"
                                >
                                  {tracker.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Statistics - only show if subscription is active */}
                        {hasActiveSubscription && siteStats[site.siteId] && (
                          <div className="mt-3 flex gap-4 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-gray-700 font-semibold">
                                {siteStats[site.siteId].uniquePages || 0}
                              </span>
                              <span className="text-gray-600">pages</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="text-gray-700 font-semibold">
                                {siteStats[site.siteId].totalViews || 0}
                              </span>
                              <span className="text-gray-600">views</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Connection Status - Only show if subscription is active */}
                    {hasActiveSubscription && (
                      <div className="border-t pt-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-semibold text-gray-700">
                              Connection Status
                            </h4>
                            {site.isVerified ? (
                              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                                ✓ Connected
                              </span>
                            ) : (
                              <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                                ⚠ Not Connected
                              </span>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              if (!site.siteId) return;
                              setLoading(true);
                              try {
                                // First refresh sites list to get latest status
                                await fetchSites();
                                // Also get verification info
                                await getVerificationInfo(site);
                                // Check the updated status
                                const response = await fetch("/api/sites");
                                if (response.ok) {
                                  const updatedSites = await response.json();
                                  const updatedSite = updatedSites.find(s => s.id === site.id);
                                  if (updatedSite?.isVerified) {
                                    alert("✓ Domain is connected!");
                                    // Refresh the sites list to update UI
                                    await fetchSites();
                                  } else {
                                    alert("Domain is not connected yet. Make sure the script is added to your website.");
                                  }
                                }
                              } catch (err) {
                                console.error("Error checking connection:", err);
                                alert("Error checking connection status");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {loading ? (
                              <>
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Checking...
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Check Connection
                              </>
                            )}
                          </button>
                        </div>
                        
                        {!site.isVerified && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-900 mb-2">
                              <strong>How it works:</strong> Add the script below to your website. 
                              Connection happens automatically when the script loads on your domain.
                            </p>
                            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                              <li>Copy the script tag below</li>
                              <li>Add it to your website&apos;s <code className="bg-blue-100 px-1 rounded">&lt;head&gt;</code> section</li>
                              <li>The script will automatically connect your domain when it loads</li>
                              <li>Refresh this page to check connection status</li>
                            </ol>
                          </div>
                        )}

                        {site.isVerified && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-green-800">
                              ✓ <strong>Connected!</strong> Your domain is connected and the script is working correctly.
                              {site.verifiedAt && (
                                <span className="ml-2">
                                  (Connected on {new Date(site.verifiedAt).toLocaleDateString()})
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Script Section - Only show if subscription is active */}
                    {hasActiveSubscription && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Consent Script
                        </h4>
                        <div className="bg-gray-900 rounded-lg p-4 mb-3">
                          <code className="text-green-400 text-sm break-all">
                            {scriptTag}
                          </code>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyScript(site)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                              copiedId === site.id
                                ? "bg-green-600 text-white"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {copiedId === site.id ? "✓ Copied!" : "Copy Script"}
                          </button>
                          <button
                            onClick={() => deleteSite(site.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Add this script to your website&apos;s &lt;head&gt; section,
                          before all tracking scripts
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Statistics</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Domains</p>
              <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Domains</p>
              <p className="text-2xl font-bold text-gray-900">
                {sitesUsed}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Domains</p>
              <p className="text-2xl font-bold text-indigo-600">
                {sitesUsed}
              </p>
            </div>
          </div>
          {/* Plans are now per-domain, so no account-level limit warning */}
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

