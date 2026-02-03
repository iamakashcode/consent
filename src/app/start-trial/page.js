"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

function StartTrialContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [profile, setProfile] = useState(null);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      const redirectUrl = "/start-trial" + (callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "");
      router.push(`/login?callbackUrl=${encodeURIComponent(redirectUrl)}`);
      return;
    }
    if (status !== "authenticated") return;

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (res.ok) {
          setProfile(data);
          if (data.websiteUrl) {
            let d = data.websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
            setDomain(d);
          }
        }
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (profile?.trialEndAt && new Date(profile.trialEndAt) > new Date()) {
      router.push(callbackUrl);
    }
  }, [profile, callbackUrl, router]);

  const handleStartTrial = async () => {
    const d = domain.trim();
    if (!d) {
      setError("Please enter your domain");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/start-free-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start trial");
        setStarting(false);
        return;
      }
      router.push(callbackUrl);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setStarting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Start your 14-day free trial</h1>
        <p className="text-gray-500 mb-8">
          Get full access to the Basic plan ($5/month after trial). No credit card required.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-indigo-600">$5</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Basic plan</h2>
              <p className="text-sm text-gray-500 mt-1">14-day free trial, then $5/month</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 1 domain
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 100,000 page views/month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Cookie consent banner
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Tracker detection
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
          />
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={handleStartTrial}
            disabled={starting}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Starting trial...
              </span>
            ) : (
              "Start Free trial"
            )}
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            By starting the trial you get 14 days of full access. You can add your script and verify your domain from the dashboard.
          </p>
        </div>

        <p className="mt-6 text-center">
          <Link href={callbackUrl} className="text-sm text-gray-500 hover:text-gray-700">
            Skip for now → Go to dashboard
          </Link>
        </p>
      </div>
    </DashboardLayout>
  );
}

export default function StartTrialPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <StartTrialContent />
    </Suspense>
  );
}
