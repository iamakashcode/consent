"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Globe,
  LayoutTemplate,
  Loader2,
  Pencil,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { SectionCard, SectionCardHeader } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";

const TABS = [
  { id: "overview", label: "Overview", icon: SlidersHorizontal },
  { id: "banner", label: "Banner", icon: LayoutTemplate },
  { id: "usage", label: "Usage", icon: BarChart3 },
  { id: "consent", label: "Consent log", icon: ClipboardList },
];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ManageDomainPage() {
  const { siteId: siteIdParam } = useParams();
  const siteId = typeof siteIdParam === "string" ? siteIdParam : siteIdParam?.[0];
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [site, setSite] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState(null);
  const [scriptInstalled, setScriptInstalled] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [consentPage, setConsentPage] = useState(1);
  const [consent, setConsent] = useState({ logs: [], total: 0, totalPages: 0, key: "" });
  const [consentLoading, setConsentLoading] = useState(false);

  useEffect(() => {
    setConsentPage(1);
    setConsent({ logs: [], total: 0, totalPages: 0, key: "" });
  }, [siteId]);

  const loadCore = useCallback(async () => {
    if (!siteId) return null;
    const [sitesRes, subsRes, statsRes, scriptRes, verifyRes] = await Promise.all([
      fetch("/api/sites"),
      fetch("/api/subscription"),
      fetch(`/api/sites/${siteId}/stats`),
      fetch(`/api/sites/${siteId}/script-status`),
      fetch(`/api/sites/${siteId}/verify`),
    ]);

    let found = null;
    if (sitesRes.ok) {
      const list = await sitesRes.json();
      found = Array.isArray(list) ? list.find((s) => s.siteId === siteId || String(s.id) === siteId) : null;
    }

    let sub = null;
    if (subsRes.ok) {
      const data = await subsRes.json();
      const row = (data.subscriptions || []).find((item) => item.siteId === siteId);
      if (row) {
        sub = { ...row };
        const syncId = row.subscription?.paddleSubscriptionId || row.subscription?.paddleTransactionId;
        if (syncId) {
          try {
            const syncRes = await fetch("/api/payment/sync-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscriptionId: syncId, siteId }),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData?.subscription) {
                sub = {
                  ...sub,
                  subscription: syncData.subscription,
                  isActive: ["active", "trial"].includes(
                    String(syncData.subscription.status || "").toLowerCase()
                  ),
                };
              }
            }
          } catch (e) {
            console.warn("[Manage] subscription sync failed:", e);
          }
        }
      }
    }

    let st = null;
    if (statsRes.ok) st = await statsRes.json();

    let script = false;
    if (scriptRes.ok) {
      const j = await scriptRes.json();
      script = !!j.scriptInstalled;
    }

    let verified = false;
    if (verifyRes.ok) {
      const v = await verifyRes.json();
      verified = !!v.isVerified;
    }

    return { found, sub, st, script, verified };
  }, [siteId]);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const pack = await loadCore();
      if (!pack) return;
      setSite(pack.found);
      setSubscription(pack.sub);
      setStats(pack.st);
      setScriptInstalled(pack.script);
      setIsVerified(pack.verified);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load domain");
    } finally {
      setLoading(false);
    }
  }, [loadCore, siteId]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !siteId) return;
    refresh();
  }, [status, siteId, refresh]);

  useEffect(() => {
    if (tab !== "consent" || !siteId || !site) return;
    const requestKey = `${siteId}:${consentPage}`;
    setConsentLoading(true);
    fetch(`/api/sites/${siteId}/consent-log?page=${consentPage}&limit=25`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setConsent({ logs: [], total: 0, totalPages: 0, key: requestKey });
        } else {
          setConsent({
            key: requestKey,
            logs: data.logs || [],
            total: data.total ?? 0,
            totalPages: data.totalPages ?? 0,
          });
        }
      })
      .catch(() => {
        setConsent({ logs: [], total: 0, totalPages: 0, key: requestKey });
        toast.error("Failed to load consent log");
      })
      .finally(() => setConsentLoading(false));
  }, [tab, siteId, site, consentPage]);

  const copyScript = async () => {
    if (!site) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const scriptSrc = `${baseUrl}/cdn/sites/${site.siteId}/script.js`;
    const scriptTag = `<script src="${scriptSrc}"></script>`;
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Script copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session || !siteId) return null;

  if (!site) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Domain not found"
          description="This domain is not in your workspace or the link is invalid."
          action={
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard/domains">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to domains
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={Shield}
          title="Nothing here"
          description="Return to your domain list and open Manage from a connected property."
        />
      </DashboardLayout>
    );
  }

  const isActive = subscription?.isActive || false;
  const statusLower = subscription?.subscription?.status?.toLowerCase();
  const plan = subscription?.subscription?.plan
    ? subscription.subscription.plan.charAt(0).toUpperCase() + subscription.subscription.plan.slice(1)
    : "No plan";
  const views = stats && typeof stats.totalViews === "number" ? stats.totalViews : site.pageViews || 0;
  const recentViews = stats?.recentViews ?? null;
  const uniquePages = stats && typeof stats.totalUniquePages === "number" ? stats.totalUniquePages : site.uniquePages ?? 0;

  const bannerHref = `/banner?siteId=${encodeURIComponent(site.siteId)}`;
  const plansHref = `/plans?siteId=${encodeURIComponent(site.siteId)}&domain=${encodeURIComponent(site.domain)}`;
  const consentFullHref = `/dashboard/consent-log?siteId=${encodeURIComponent(site.siteId)}`;

  const logsReady = consent.key === `${site.siteId}:${consentPage}`;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link
          href={`/dashboard/domains?siteId=${encodeURIComponent(site.siteId)}`}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          All domains
        </Link>

        <PageHeader
          title={site.domain}
          description="Everything for this property in one place: banner, traffic, plan, and consent history."
          action={
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => refresh()}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <Link href={plansHref}>Plan & billing</Link>
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 mb-8 w-full lg:w-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (t.id !== "consent") setConsentPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
                active ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-indigo-600" : "text-slate-400")} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Page views" value={views.toLocaleString()} subtitle="Recorded total" icon={BarChart3} color="indigo" />
            <StatsCard
              title="30-day requests"
              value={recentViews != null ? recentViews.toLocaleString() : "—"}
              subtitle="Recent window"
              icon={Activity}
              color="blue"
            />
            <StatsCard title="Unique pages" value={uniquePages.toLocaleString()} subtitle="Tracked paths" icon={Globe} color="violet" />
            <StatsCard
              title="Plan"
              value={plan}
              subtitle={isActive ? "Active" : statusLower === "pending" ? "Payment pending" : "Needs attention"}
              icon={CheckCircle2}
              color={isActive ? "emerald" : "amber"}
            />
          </div>

          <SectionCard hoverLift>
            <SectionCardHeader title="Installation" description="Script status and verification for this domain." icon={Shield} />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between pb-1">
              <div className="flex flex-wrap gap-3 text-[13px]">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-md border",
                    scriptInstalled ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                  )}
                >
                  {scriptInstalled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  Script {scriptInstalled ? "detected" : "not detected"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-md border",
                    isVerified ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-slate-600 bg-slate-50 border-slate-200"
                  )}
                >
                  {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {isVerified ? "Verified" : "Not verified"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={copyScript}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {copied ? "Copied" : "Copy script"}
                </Button>
                <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700" asChild>
                  <Link href={bannerHref}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit banner
                  </Link>
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "banner" && (
        <SectionCard hoverLift className="max-w-2xl">
          <SectionCardHeader
            title="Consent banner"
            description="Open the full visual editor to change colors, copy, placement, and publish to your live script."
            icon={LayoutTemplate}
          />
          <div className="space-y-4 pb-1">
            <p className="text-[14px] text-slate-600 leading-relaxed">
              The banner editor runs on a dedicated screen so you get a live preview and save flow tailored to this domain only.
            </p>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link href={bannerHref}>
                <Pencil className="w-4 h-4 mr-2" />
                Open banner editor
              </Link>
            </Button>
          </div>
        </SectionCard>
      )}

      {tab === "usage" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Page views" value={views.toLocaleString()} subtitle="All-time (or API total)" icon={BarChart3} color="indigo" />
            <StatsCard
              title="30-day requests"
              value={recentViews != null ? recentViews.toLocaleString() : "—"}
              subtitle="Rolling usage signal"
              icon={BarChart3}
              color="blue"
            />
            <StatsCard title="Unique pages" value={uniquePages.toLocaleString()} subtitle="Distinct URLs" icon={BarChart3} color="violet" />
          </div>
          <SectionCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900">Workspace usage</h3>
                <p className="text-[13px] text-slate-500 mt-1">Compare this domain with others on the main usage dashboard.</p>
              </div>
              <Button variant="outline" className="rounded-xl shrink-0" asChild>
                <Link href={`/dashboard/usage?siteId=${encodeURIComponent(site.siteId)}`}>Open full usage page</Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "consent" && (
        <SectionCard noPadding className="overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">Consent events</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Latest choices for {site.domain}.</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl shrink-0" asChild>
              <Link href={consentFullHref}>Open full log & filters</Link>
            </Button>
          </div>
          {consentLoading || !logsReady ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : consent.logs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ClipboardList}
                title="No consent events yet"
                description="Once visitors interact with your banner, entries will show up here."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-slate-600 h-11 px-6">Outcome</TableHead>
                      <TableHead className="font-medium text-slate-600 h-11">Scopes</TableHead>
                      <TableHead className="font-medium text-slate-600 h-11">When</TableHead>
                      <TableHead className="font-medium text-slate-600 h-11 px-6">Page</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consent.logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 border-b border-slate-100/60">
                        <TableCell className="px-6 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2.5 py-1 text-[12px] font-semibold uppercase rounded-md border",
                              log.status === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-rose-50 text-rose-700 border-rose-200/60"
                            )}
                          >
                            {log.status === "accepted" ? "Accepted" : "Rejected"}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px]">
                          {log.categories ? (
                            <span className="text-slate-600">
                              {[log.categories.analytics && "Analytics", log.categories.marketing && "Marketing"].filter(Boolean).join(", ") || "Essential"}
                            </span>
                          ) : (
                            <span className="text-slate-500">All</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600 text-[13px] whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                        <TableCell className="px-6 max-w-[200px] truncate text-[13px]">
                          {log.pageUrl ? (
                            <a href={log.pageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                              {(() => {
                                try {
                                  return new URL(log.pageUrl).pathname;
                                } catch {
                                  return log.pageUrl;
                                }
                              })()}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {consent.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-slate-50/50 border-t border-slate-100 text-[13px] text-slate-600">
                  <span>
                    Page {consentPage} of {consent.totalPages} · {consent.total.toLocaleString()} total
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg h-8" disabled={consentPage <= 1} onClick={() => setConsentPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg h-8"
                      disabled={consentPage >= consent.totalPages}
                      onClick={() => setConsentPage((p) => Math.min(consent.totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>
      )}
    </DashboardLayout>
  );
}
