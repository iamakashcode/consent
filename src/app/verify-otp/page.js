"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
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

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [emailParam]);

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
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">ConsentFlow</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
          <p className="text-gray-500 mb-2">
            We sent a 6-digit code to your email. Enter it below.
          </p>
          <p className="text-gray-500 mb-6 text-sm">
            OTP expires in <span className="font-medium text-gray-700">10 minutes</span>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification code (6 digits)
              </label>
              <InputOTP
                id="otp"
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
                containerClassName="justify-center"
              >
                <InputOTPGroup className="justify-center gap-2 sm:gap-3 bg-white border-2 border-gray-200 rounded-xl p-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-14 w-12 sm:h-16 sm:w-14 text-2xl sm:text-3xl font-semibold border-2 border-gray-200 rounded-lg bg-gray-50 data-[active=true]:border-indigo-500 data-[active=true]:ring-2 data-[active=true]:ring-indigo-200"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Verifying...
                </span>
              ) : (
                "Verify and sign in"
              )}
            </button>

            <p className="text-sm text-center text-gray-500">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-indigo-600 hover:text-indigo-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
