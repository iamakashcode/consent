"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import { ShieldAlert, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams?.get("_ptxn");
  const addonParam = searchParams?.get("addon");
  const redirectParam = searchParams?.get("redirect");
  const siteIdParam = searchParams?.get("siteId");
  const [clientToken, setClientToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);

  useEffect(() => {
    const fetchClientToken = async () => {
      try {
        const response = await fetch("/api/paddle/client-token");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to initialize secure checkout session");
        }

        setClientToken(data.token);
      } catch (error) {
        setTokenError(error.message);
      }
    };

    fetchClientToken();
  }, []);

  useEffect(() => {
    if (!transactionId || !clientToken) return;

    const initializeAndOpen = () => {
      if (!window.Paddle) return;

      try {
        const isSandbox = clientToken.startsWith("test_");
        if (isSandbox) window.Paddle.Environment.set("sandbox");

        window.Paddle.Initialize({ token: clientToken });

        const siteId = siteIdParam || (typeof window !== "undefined" ? window.sessionStorage?.getItem("paddle_site_id") : null);
        const isAddon = addonParam === "remove_branding";
        const redirectTarget = isAddon && redirectParam
          ? redirectParam
          : `/dashboard/domains?payment=success${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ""}`;
        
        const successUrl = `${window.location.origin}/payment/return?transaction_id=${encodeURIComponent(transactionId)}${siteId ? `&siteId=${encodeURIComponent(siteId)}` : ""}${isAddon ? "&addon=remove_branding" : ""}&redirect=${encodeURIComponent(redirectTarget)}`;

        window.Paddle.Checkout.open({
          transactionId: transactionId,
          settings: {
            successUrl,
            displayMode: "overlay",
          },
        });
      } catch (error) {
        setTokenError(`Failed to establish secure connection: ${error.message}`);
      }
    };

    if (typeof window !== "undefined" && window.Paddle) {
      initializeAndOpen();
    } else {
      const checkPaddle = setInterval(() => {
        if (window.Paddle) {
          clearInterval(checkPaddle);
          initializeAndOpen();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkPaddle);
        if (!window.Paddle) setTokenError("Payment gateway timed out. Please check your connection and refresh.");
      }, 10000);
    }
  }, [transactionId, clientToken, addonParam, redirectParam, siteIdParam]);

  if (!transactionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="text-center max-w-sm w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Invalid Session</h1>
          <p className="text-[14px] text-slate-500">No active checkout identifier found. Please start the process again from your dashboard.</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="text-center max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-rose-100">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
             <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Connection Error</h1>
          <p className="text-[14px] font-medium text-rose-600 bg-rose-50 p-3 rounded-xl mb-6">{tokenError}</p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-medium"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
          </Button>
          <p className="text-[13px] text-slate-400 mt-4">
            If the issue persists, your protective software might be blocking the secure payment gateway.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" />
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-md border border-slate-100 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-[3px] border-indigo-100 rounded-3xl"></div>
            <div className="absolute inset-0 border-[3px] border-indigo-600 rounded-3xl border-t-transparent animate-spin"></div>
            <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-ping"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Opening secure checkout</h2>
          <p className="text-[15px] font-medium text-slate-500">
            {!clientToken ? "Initializing encryption..." : "Connecting to paddle..."}
          </p>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
