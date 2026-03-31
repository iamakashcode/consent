"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isFormValid = formData.email.trim() !== "" && formData.password.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Simple check for unverified email based on existing logic
        try {
          const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(formData.email)}`);
          const data = await res.json();
          if (data.exists && !data.verified) {
            setError("unverified");
            setIsLoading(false);
            return;
          }
        } catch (_) {}
        
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // signIn("google", { callbackUrl });
    setTimeout(() => setIsLoading(false), 1000); // placeholder
  };

  return (
    <div className="w-full">
      {/* Error state */}
      {error && (
        <div className={`mb-6 p-4 rounded-xl text-[13px] font-medium animate-in fade-in slide-in-from-top-2 ${
          error === "unverified" 
            ? "bg-amber-50 border border-amber-200/60 text-amber-800" 
            : "bg-red-50 border border-red-200/60 text-red-700"
        }`}>
          {error === "unverified" ? (
            <div className="flex flex-col gap-1.5">
              <span>Please verify your email to sign in.</span>
              <div className="flex gap-3">
                <Link href={`/verify-otp?email=${encodeURIComponent(formData.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline underline-offset-2 hover:text-amber-900 transition-colors">
                  Verify now
                </Link>
                <Link href={`/verify-otp?email=${encodeURIComponent(formData.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline underline-offset-2 hover:text-amber-900 transition-colors">
                  Resend OTP
                </Link>
              </div>
            </div>
          ) : (
            <span>{error}</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            disabled={isLoading}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
            placeholder="name@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4 transition-all"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={isLoading}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3.5 py-2.5 pr-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg focus:outline-none focus:bg-slate-100 transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            disabled={isLoading}
            checked={formData.remember}
            onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
            className="w-4 h-4 rounded appearance-none border border-slate-300 bg-white checked:bg-indigo-600 checked:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200 cursor-pointer disabled:opacity-50 checked:bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9IndoaXRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMi4yMDcgNC4yOTNsLTEuNDE0LTEuNDE0TDcgNy4xNzJMNyA4LjU4Nmw0LjQxNC00LjQxNEwxMi4yMDcgNC4yOTN6TTUuNDE0IDUuMTMyTDQgNi41NDZsNS45NCA1Ljk0IDEuNDE0LTEuNDE0TDQuMTMyIDUuMTR6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==')] bg-no-repeat bg-center"
          />
          <label htmlFor="remember" className="text-[13px] font-medium text-slate-600 select-none cursor-pointer">
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="relative w-full py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-medium rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_1px_rgba(255,255,255,0.05)_inset] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group overflow-hidden"
        >
          {/* Subtle button gradient shine on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
          
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Social divider */}
      <div className="mt-7 mb-6 relative flex items-center">
        <div className="flex-grow border-t border-slate-200/80"></div>
        <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 bg-white px-2 rounded-lg">
          OR
        </span>
        <div className="flex-grow border-t border-slate-200/80"></div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      {/* Footer link */}
      <p className="mt-8 text-center text-[13px] text-slate-500 font-medium">
        Don&apos;t have an account?{" "}
        <Link 
          href={`/signup${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} 
          className="text-slate-900 font-bold hover:underline underline-offset-4 transition-all"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
