"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    websiteUrl: "",
    agreed: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.password.trim() !== "" &&
    formData.confirmPassword.trim() !== "" &&
    formData.websiteUrl.trim() !== "" &&
    formData.agreed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    let url = formData.websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name, // Passing name to API (if backend supports it)
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          websiteUrl: url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
        <div className="mb-6 p-4 rounded-xl text-[13px] font-medium bg-red-50 border border-red-200/60 text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Social login option */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full py-2.5 px-4 mb-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Sign up with Google
      </button>

      <div className="mb-6 relative flex items-center">
        <div className="flex-grow border-t border-slate-200/80"></div>
        <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 bg-white px-2">
          OR
        </span>
        <div className="flex-grow border-t border-slate-200/80"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            disabled={isLoading}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
            placeholder="John Doe"
          />
        </div>

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
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-slate-700">
            Domain
          </label>
          <input
            id="websiteUrl"
            type="text"
            required
            disabled={isLoading}
            value={formData.websiteUrl}
            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
            placeholder="yourdomain.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 relative">
            <label htmlFor="password" className="block text-[13px] font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                disabled={isLoading}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg focus:outline-none focus:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-slate-700">
              Confirm
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                disabled={isLoading}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg focus:outline-none focus:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {showConfirmPassword ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 pt-2 pb-1">
          <input
            type="checkbox"
            id="agreed"
            disabled={isLoading}
            checked={formData.agreed}
            onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
            className="w-4 h-4 mt-0.5 rounded appearance-none border border-slate-300 bg-white checked:bg-indigo-600 checked:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200 cursor-pointer disabled:opacity-50 checked:bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9IndoaXRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMi4yMDcgNC4yOTNsLTEuNDE0LTEuNDE0TDcgNy4xNzJMNyA4LjU4Nmw0LjQxNC00LjQxNEwxMi4yMDcgNC4yOTN6TTUuNDE0IDUuMTMyTDQgNi41NDZsNS45NCA1Ljk0IDEuNDE0LTEuNDE0TDQuMTMyIDUuMTR6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==')] bg-no-repeat bg-center"
          />
          <label htmlFor="agreed" className="text-xs font-medium text-slate-500 leading-tight">
            I agree to ConsentFlow&apos;s{" "}
            <a href="#" className="font-bold text-slate-700 hover:underline underline-offset-2">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="font-bold text-slate-700 hover:underline underline-offset-2">Privacy Policy</a>.
          </label>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="relative w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(99,102,241,0.25)] border border-indigo-500 text-white font-medium rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />

          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Get Started Free"
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-8 text-center text-[13px] text-slate-500 font-medium">
        Already have an account?{" "}
        <Link
          href={`/login${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="text-slate-900 font-bold hover:underline underline-offset-4 transition-all"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
