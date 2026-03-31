"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    setError("");
    setSent(false);
    
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email to receive a reset link."
    >
      <div className="w-full">
        {sent ? (
          <div className="animate-in fade-in slide-in-from-top-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl text-[13px] font-medium text-emerald-800 mb-6 leading-relaxed">
              If an account exists with this email, you will receive a password reset link shortly. Check your inbox and spam folder.
            </div>
            <Link 
              href="/login" 
              className="flex items-center justify-center w-full py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-medium rounded-xl transition-all duration-200"
            >
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
                placeholder="name@company.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="relative w-full py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-medium rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_1px_rgba(255,255,255,0.05)_inset] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}

        {/* Footer link */}
        <p className="mt-8 text-center text-[13px] text-slate-500 font-medium">
          Remembered your password?{" "}
          <Link 
            href="/login" 
            className="text-slate-900 font-bold hover:underline underline-offset-4 transition-all"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
