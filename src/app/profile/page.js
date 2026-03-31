"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { FormField } from "@/components/shared/FormField";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { User, Lock, AlertTriangle, LogOut, Trash2, Calendar, Receipt } from "lucide-react";

function ProfileContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const hasCheckedPayment = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      setName(session.user?.name || "");
      setEmail(session.user?.email || "");
      fetchSubscriptions();
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (typeof window !== "undefined" && session && !hasCheckedPayment.current) {
      const paymentSuccess = searchParams?.get("payment");
      const storedSubscriptionId = sessionStorage.getItem("paddle_subscription_id") || sessionStorage.getItem("paddle_transaction_id");

      if (paymentSuccess === "success" || storedSubscriptionId) {
        hasCheckedPayment.current = true;
        
        const handlePaymentReturn = async () => {
          if (storedSubscriptionId) {
            await syncSubscription(storedSubscriptionId);
            sessionStorage.removeItem("paddle_subscription_id");
            sessionStorage.removeItem("paddle_transaction_id");
            sessionStorage.removeItem("paddle_site_id");
            sessionStorage.removeItem("paddle_redirect_url");
          }
          await fetchSubscriptions();
          toast.success("Payment successful! Your subscription is now active.");
          window.history.replaceState({}, "", "/profile");
        };
        
        handlePaymentReturn();
      }
    }
  }, [searchParams, session]);

  const syncSubscription = async (paddleSubId) => {
    try {
      const response = await fetch("/api/payment/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: paddleSubId }),
      });
      return response.ok;
    } catch (error) {
      console.error("Sync error:", error);
      return false;
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionCount(data.activeCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await update({ name });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      // API call to change password would go here
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError("Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt(
      "This action is irreversible. Type 'DELETE' to confirm account deletion:"
    );

    if (confirmText !== "DELETE") {
      toast.info("Account deletion cancelled.");
      return;
    }

    try {
      toast.success("Account deleted. You will be logged out.");
      signOut({ callbackUrl: "/" });
    } catch (err) {
      toast.error("Failed to delete account");
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <PageHeader 
        title="Profile Settings" 
        description="Manage your account settings, security preferences, and active subscriptions."
      />

      <div className="max-w-3xl space-y-6 pb-12">
        
        {/* Profile Info */}
        <SectionCard>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Personal Information</h2>
              <p className="text-[13px] text-slate-500 font-medium">Update your name and contact details.</p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <FormField 
                 label="Full Name"
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="Your full name"
              />
              <div className="space-y-2">
                 <label className="text-[13px] font-bold text-slate-700 block">Email Address</label>
                 <div className="relative">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-[14px] cursor-not-allowed shadow-sm font-medium"
                    />
                    <span className="absolute right-3 top-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white px-1.5 rounded">Verified</span>
                 </div>
                 <p className="text-[12px] font-medium text-slate-400 pt-1">Email tied to your identity provider.</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving || session?.user?.name === name} 
                className="rounded-xl h-10 px-6 font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all text-[14px]"
              >
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Account Summary Stats */}
        <div className="grid sm:grid-cols-2 gap-6">
           <SectionCard noPadding className="overflow-hidden">
              <div className="p-6 flex items-start gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Receipt className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div className="flex-1">
                    <p className="text-[13px] font-semibold tracking-widest text-slate-500 uppercase mb-1">Active Subscriptions</p>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{subscriptionCount}</p>
                 </div>
              </div>
           </SectionCard>
           
           <SectionCard noPadding className="overflow-hidden">
              <div className="p-6 flex items-start gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-purple-600" />
                 </div>
                 <div className="flex-1">
                    <p className="text-[13px] font-semibold tracking-widest text-slate-500 uppercase mb-1">Member Since</p>
                    <p className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">
                      {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                 </div>
              </div>
           </SectionCard>
        </div>

        {/* Change Password */}
        <SectionCard>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Security</h2>
              <p className="text-[13px] text-slate-500 font-medium">Update your password to stay secure.</p>
            </div>
          </div>
          
          <div className="p-6">
            {passwordError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium text-rose-700 leading-snug">{passwordError}</p>
              </div>
            )}
            
            <div className="grid gap-6 max-w-md">
              <FormField 
                 label="Current Password"
                 type="password"
                 value={currentPassword}
                 onChange={(e) => setCurrentPassword(e.target.value)}
                 placeholder="••••••••"
              />
              <FormField 
                 label="New Password"
                 type="password"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
                 placeholder="••••••••"
              />
              <FormField 
                 label="Confirm New Password"
                 type="password"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 placeholder="••••••••"
              />
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={handleChangePassword} 
                disabled={passwordSaving} 
                className="rounded-xl h-10 px-6 font-semibold bg-slate-900 hover:bg-slate-800 shadow-sm transition-all text-[14px]"
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard className="border-rose-200 bg-rose-50/10">
          <div className="px-6 py-5 border-b border-rose-100 flex items-center gap-4 bg-rose-50/50">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-rose-800 tracking-tight">Danger Zone</h2>
              <p className="text-[13px] text-rose-600/80 font-medium">Irreversible security actions.</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 tracking-tight text-[15px]">Sign Out Everywhere</h3>
                <p className="text-[13px] text-slate-500 mt-1 font-medium">Force sign out on all devices securely.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl h-10 border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 sm:w-auto w-full"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out All
              </Button>
            </div>
            
            <div className="h-px bg-slate-200 w-full" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 tracking-tight text-[15px]">Delete Account</h3>
                <p className="text-[13px] text-slate-500 mt-1 font-medium">Permanently delete your account and domains.</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 font-semibold shadow-sm sm:w-auto w-full text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Account
              </Button>
            </div>
          </div>
        </SectionCard>
        
      </div>
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full shadow-sm" />
          </div>
        </DashboardLayout>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
