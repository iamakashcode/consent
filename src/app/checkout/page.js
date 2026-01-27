"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import Script from "next/script";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams?.get("_ptxn");

  useEffect(() => {
    if (!transactionId) {
      console.error("[Checkout] No transaction ID in URL");
      return;
    }

    // Wait for Paddle.js to load
    if (typeof window !== "undefined" && window.Paddle) {
      openPaddleCheckout();
    } else {
      // Wait for Paddle.js to load
      const checkPaddle = setInterval(() => {
        if (window.Paddle) {
          clearInterval(checkPaddle);
          openPaddleCheckout();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkPaddle), 5000);
    }

    function openPaddleCheckout() {
      if (!window.Paddle) {
        console.error("[Checkout] Paddle.js not loaded");
        return;
      }

      try {
        // Get client-side token from environment or use default
        // For sandbox, Paddle.js can work without explicit initialization for transaction checkout
        // Open Paddle checkout using transaction ID
        // Format: Paddle.Checkout.open({ transactionId: "txn_xxx" })
        window.Paddle.Checkout.open({
          transactionId: transactionId,
          settings: {
            successUrl: `${window.location.origin}/dashboard/usage?payment=success`,
            displayMode: "overlay",
          },
        });

        console.log("[Checkout] Opened Paddle checkout for transaction:", transactionId);
      } catch (error) {
        console.error("[Checkout] Error opening Paddle checkout:", error);
        // Fallback: try redirecting to the checkout URL directly
        const checkoutUrl = `${window.location.origin}?_ptxn=${transactionId}`;
        console.log("[Checkout] Fallback: redirecting to:", checkoutUrl);
        window.location.href = checkoutUrl;
      }
    }
  }, [transactionId]);

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

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={() => {
          console.log("[Checkout] Paddle.js loaded");
          // Initialize Paddle with client-side token (if needed)
          // For transaction checkout, we might not need initialization
        }}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Opening checkout...</p>
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
