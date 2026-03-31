"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function VerifyOtpContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get("email");
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const emailFromUrl = emailParam ? (() => { try { return decodeURIComponent(emailParam); } catch { return ""; } })() : "";
  const [userEmailOverride, setUserEmailOverride] = useState("");
  const email = userEmailOverride !== "" ? userEmailOverride : emailFromUrl;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || otp.length !== 6) {
      setError("Enter your email and 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid or expired OTP");
        setLoading(false);
        return;
      }
      
      const result = await signIn("verify-token", {
        token: data.verifyToken,
        redirect: false,
      });
      
      if (result?.error) {
        setError("Verification succeeded but login failed. Please sign in with your password.");
        setLoading(false);
        // Do not block UI, allow user to click back to login
        return;
      }
      
      // Full page redirect so session cookie is sent and start-trial gets authenticated user
      window.location.href = `/start-trial?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend OTP");
        return;
      }
      setResendCooldown(30);
      setError("");
    } catch (err) {
      setError("Failed to resend OTP");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (session) return null;

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox."
    >
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-[13px] font-medium text-red-700 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setUserEmailOverride(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700">
                Verification code
              </label>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                Expires in 10m
              </span>
            </div>
            <div className="flex justify-center">
              <InputOTP
                id="otp"
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
                disabled={loading}
              >
                <InputOTPGroup className="gap-2 sm:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-12 w-10 sm:h-14 sm:w-12 text-xl font-bold bg-white border border-slate-200 transition-all rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 data-[active=true]:border-indigo-500 data-[active=true]:ring-4 data-[active=true]:ring-indigo-500/10"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || !email.trim()}
            className="relative w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(99,102,241,0.25)] border border-indigo-500 text-white font-medium rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
          <p className="text-[13px] text-center text-slate-500 font-medium">
            Didn't receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline underline-offset-4 disabled:text-slate-400 disabled:no-underline transition-all"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </button>
          </p>
          <p className="text-[13px] text-center text-slate-500 font-medium">
            <Link href="/login" className="text-slate-900 font-bold hover:underline underline-offset-4 transition-all">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
