"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Script from "next/script";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams?.get("_ptxn");
  const [clientToken, setClientToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);

  // Fetch client-side token from API
  useEffect(() => {
    const fetchClientToken = async () => {
      try {
        const response = await fetch("/api/paddle/client-token");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get client token");
        }

        setClientToken(data.token);
        console.log("[Checkout] Client token fetched, environment:", data.environment);
      } catch (error) {
        console.error("[Checkout] Error fetching client token:", error);
        setTokenError(error.message);
      }
    };

    fetchClientToken();
  }, []);

  useEffect(() => {
    if (!transactionId) {
      console.error("[Checkout] No transaction ID in URL");
      return;
    }

    if (!clientToken) {
      // Wait for client token to be fetched
      return;
    }

    // Initialize Paddle.js and open checkout
    const initializeAndOpen = () => {
      if (!window.Paddle) {
        console.error("[Checkout] Paddle.js not loaded");
        return;
      }

      try {
        // Set environment (sandbox or live) based on token prefix
        const isSandbox = clientToken.startsWith("test_");
        if (isSandbox) {
          window.Paddle.Environment.set("sandbox");
          console.log("[Checkout] Set Paddle environment to sandbox");
        }

        // Initialize Paddle.js with client-side token
        window.Paddle.Initialize({
          token: clientToken,
        });


        // Redirect to our return page after payment so we can confirm pending domain (activate Site + Subscription)
        const siteId = typeof window !== "undefined" ? window.sessionStorage?.getItem("paddle_site_id") : null;
        const redirectTarget = `/dashboard/domains?payment=success${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ""}`;
        const successUrl = `${window.location.origin}/payment/return?transaction_id=${encodeURIComponent(transactionId)}${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ""}&redirect=${encodeURIComponent(redirectTarget)}`;

        window.Paddle.Checkout.open({
          transactionId: transactionId,
          settings: {
            successUrl,
            displayMode: "overlay",
          },
        });

        console.log("[Checkout] Opened Paddle checkout for transaction:", transactionId);
      } catch (error) {
        console.error("[Checkout] Error opening Paddle checkout:", error);
        setTokenError(`Failed to open checkout: ${error.message}`);
      }
    };

    // Wait for Paddle.js to load
    if (typeof window !== "undefined" && window.Paddle) {
      initializeAndOpen();
    } else {
      // Wait for Paddle.js to load
      const checkPaddle = setInterval(() => {
        if (window.Paddle) {
          clearInterval(checkPaddle);
          initializeAndOpen();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkPaddle);
        if (!window.Paddle) {
          setTokenError("Paddle.js failed to load. Please refresh the page.");
        }
      }, 10000);
    }
  }, [transactionId, clientToken]);

  if (!transactionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Checkout</h1>
          <p className="text-gray-600">No transaction ID provided.</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h1 className="text-xl font-bold text-red-900 mb-2">Checkout Error</h1>
            <p className="text-red-700 text-sm mb-4">{tokenError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
          <p className="text-gray-500 text-sm">
            If the issue persists, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={() => {
          console.log("[Checkout] Paddle.js loaded");
        }}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!clientToken ? "Loading checkout..." : "Opening checkout..."}
          </p>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
