"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getScriptPath } from "@/lib/script-urls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, CheckCircle2, ShieldCheck, PaintBucket, Columns, Settings2, LayoutTemplate, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIONS = [
  { id: "bottom", label: "Bottom", icon: <Columns className="rotate-90 w-4 h-4" /> },
  { id: "top", label: "Top", icon: <Columns className="-rotate-90 w-4 h-4" /> },
  { id: "bottom-left", label: "Bottom Left", icon: <LayoutTemplate className="w-4 h-4 flip-horizontal rotate-180" /> },
  { id: "bottom-right", label: "Bottom Right", icon: <LayoutTemplate className="w-4 h-4 rotate-180" /> },
];

const DESIGN_PRESETS = [
  {
    id: "minimal",
    name: "Minimalist",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    buttonColor: "#0f172a",
    buttonTextColor: "#ffffff",
    position: "bottom",
  },
  {
    id: "modern",
    name: "Modern Brand",
    backgroundColor: "#4f46e5",
    textColor: "#ffffff",
    buttonColor: "#ffffff",
    buttonTextColor: "#4f46e5",
    position: "bottom",
  },
  {
    id: "dark",
    name: "Midnight",
    backgroundColor: "#09090b",
    textColor: "#fafafa",
    buttonColor: "#fafafa",
    buttonTextColor: "#09090b",
    position: "bottom",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    backgroundColor: "#f8fafc",
    textColor: "#334155",
    buttonColor: "#2563eb",
    buttonTextColor: "#ffffff",
    position: "bottom",
  },
];

const DEFAULT_CONFIG = {
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  buttonColor: "#0f172a",
  buttonTextColor: "#ffffff",
  position: "bottom",
  title: "We value your privacy",
  description: "We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking 'Accept All', you consent to our use of cookies.",
  acceptText: "Accept All",
  rejectText: "Reject All",
  customizeText: "Customize Settings",
  showRejectButton: true,
  showCustomizeButton: true,
};

const normalizeEditorConfig = (rawConfig) => {
  if (!rawConfig || typeof rawConfig !== "object") return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    description: rawConfig.description ?? rawConfig.message ?? DEFAULT_CONFIG.description,
    acceptText: rawConfig.acceptText ?? rawConfig.acceptButtonText ?? DEFAULT_CONFIG.acceptText,
    rejectText: rawConfig.rejectText ?? rawConfig.rejectButtonText ?? DEFAULT_CONFIG.rejectText,
    customizeText: rawConfig.customizeText ?? rawConfig.customizeButtonText ?? DEFAULT_CONFIG.customizeText,
    showRejectButton: rawConfig.showRejectButton ?? rawConfig.showReject ?? DEFAULT_CONFIG.showRejectButton,
    showCustomizeButton: rawConfig.showCustomizeButton ?? DEFAULT_CONFIG.showCustomizeButton,
  };
};

function BannerContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [previewSourceHtml, setPreviewSourceHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [debouncedConfig, setDebouncedConfig] = useState(DEFAULT_CONFIG);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [showInstall, setShowInstall] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState("manual");
  const [isVerified, setIsVerified] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [canCustomizeBanner, setCanCustomizeBanner] = useState(true);
  const [cannotCustomizeReason, setCannotCustomizeReason] = useState("");
  const [addonCheckoutLoading, setAddonCheckoutLoading] = useState(false);
  const [siteStats, setSiteStats] = useState({ totalViews: 0, totalUniquePages: 0 });
  const selectedSiteRef = useRef(null);
  const hasFetchedRef = useRef(false);
  const customizeSectionRef = useRef(null);

  const fetchSiteStats = useCallback(async (siteId) => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/sites/${siteId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setSiteStats({
          totalViews: data.totalViews ?? 0,
          totalUniquePages: data.totalUniquePages ?? 0,
        });
      }
    } catch {
      setSiteStats({ totalViews: 0, totalUniquePages: 0 });
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const sanitizeDomain = useCallback((value) => {
    if (!value) return "";
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].trim();
  }, []);

  const encodePreviewConfig = useCallback((value) => {
    try {
      const json = JSON.stringify(value);
      return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
    } catch {
      return "";
    }
  }, []);

  const buildPreviewHtml = useCallback((html, domain, siteId, currentConfig) => {
    if (!html) return "";
    const safeDomain = sanitizeDomain(domain);
    if (!safeDomain) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const configParam = currentConfig ? encodePreviewConfig(currentConfig) : "";
    const baseTag = `<base href="https://${safeDomain}/" />`;
    const scriptTag = `<script src="${baseUrl}/api/script/${siteId}?domain=${encodeURIComponent(safeDomain)}&preview=1${configParam ? `&config=${configParam}` : ""}"></script>`;
    let output = html;

    if (/<head[^>]*>/i.test(output)) {
      output = output.replace(/<head[^>]*>/i, (match) => `${match}\n${baseTag}`);
    } else {
      output = `${baseTag}\n` + output;
    }

    if (/<\/body>/i.test(output)) {
      output = output.replace(/<\/body>/i, `${scriptTag}\n</body>`);
    } else if (/<\/html>/i.test(output)) {
      output = output.replace(/<\/html>/i, `${scriptTag}\n</html>`);
    } else {
      output = `${output}\n${scriptTag}`;
    }

    return output;
  }, [encodePreviewConfig, sanitizeDomain]);

  const loadPreviewOnce = useCallback(async (site, initialConfig) => {
    const safeDomain = sanitizeDomain(site?.domain);
    if (!safeDomain || !site?.siteId) return;
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const response = await fetch(`/api/preview?domain=${encodeURIComponent(safeDomain)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Preview unavailable");
      }
      const data = await response.json();
      setPreviewSourceHtml(data.html);
      const html = buildPreviewHtml(data.html, safeDomain, site.siteId, initialConfig);
      if (html) setPreviewHtml(html);
    } catch (err) {
      setPreviewSourceHtml("");
      setPreviewHtml("");
      setPreviewError(err.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  }, [buildPreviewHtml, sanitizeDomain]);

  useEffect(() => {
    if (status !== "authenticated" || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchSitesOnce = async () => {
      try {
        const [sitesRes, subsRes] = await Promise.all([
          fetch("/api/sites"),
          fetch("/api/subscription"),
        ]);

        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          let activeSites = [];

          if (subsRes.ok) {
            const subsData = await subsRes.json();
            const subscriptionsMap = {};
            (subsData.subscriptions || []).forEach((item) => {
              subscriptionsMap[item.siteId] = { ...item, userTrialActive: subsData.userTrialActive || false };
            });

            activeSites = sitesData.filter(site => {
              const subData = subscriptionsMap[site.siteId];
              return subData?.isActive || subsData.userTrialActive;
            });
          } else {
            activeSites = sitesData;
          }

          setSites(activeSites);
          const siteIdParam = searchParams?.get("siteId");
          let nextSite = activeSites.length > 0 ? activeSites.find(s => s.siteId === siteIdParam || s.id === siteIdParam) || activeSites[0] : null;

          if (nextSite) {
            setSelectedSite(nextSite);
            selectedSiteRef.current = nextSite;
            fetchSiteStats(nextSite.siteId);
            let initialConfig = DEFAULT_CONFIG;
            if (nextSite?.bannerConfig) {
              try {
                const parsedConfig = typeof nextSite.bannerConfig === "string" ? JSON.parse(nextSite.bannerConfig) : nextSite.bannerConfig;
                initialConfig = normalizeEditorConfig(parsedConfig);
              } catch {
                initialConfig = DEFAULT_CONFIG;
              }
            }
            setConfig(initialConfig);
            setDebouncedConfig(initialConfig);
            loadPreviewOnce(nextSite, initialConfig);
            fetch(`/api/sites/${nextSite.siteId}/can-customize`)
              .then((res) => res.ok ? res.json() : { canCustomize: true })
              .then((data) => {
                setCanCustomizeBanner(!!data.canCustomize);
                setCannotCustomizeReason(data.reason || "");
              }).catch(() => { });
            checkVerificationStatus(nextSite.siteId);
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSitesOnce();
  }, [status, loadPreviewOnce, searchParams, fetchSiteStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConfig(config);
    }, 350);
    return () => clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    if (!previewSourceHtml || !selectedSite) return;
    const html = buildPreviewHtml(previewSourceHtml, selectedSite.domain, selectedSite.siteId, debouncedConfig);
    if (html) setPreviewHtml(html);
  }, [buildPreviewHtml, debouncedConfig, previewSourceHtml, selectedSite]);

  const handleSave = async () => {
    if (!selectedSite) return;

    setSaving(true);
    try {
      const bannerConfig = {
        ...config,
        message: config.description ?? config.message,
        acceptButtonText: config.acceptText,
        rejectButtonText: config.rejectText,
        customizeButtonText: config.customizeText,
        showCustomizeButton: config.showCustomizeButton,
      };
      const response = await fetch(`/api/sites/${selectedSite.siteId}/banner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerConfig }),
      });

      if (response.ok) {
        toast.success("Banner settings saved successfully!");
        setSites((prev) => prev.map((s) => s.siteId === selectedSite.siteId ? { ...s, bannerConfig } : s));
        setSelectedSite((prev) => (prev ? { ...prev, bannerConfig } : prev));
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const checkVerificationStatus = async (siteId) => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/sites/${siteId}/verify`);
      if (res.ok) {
        const data = await res.json();
        setIsVerified(data.isVerified || false);
      }
    } catch (err) { }
  };

  const handleVerify = async () => {
    if (!selectedSite) return;
    setVerifyStatus("Crawling website...");
    try {
      const crawlRes = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedSite.domain }),
      });

      if (!crawlRes.ok) {
        setVerifyStatus("Crawl failed");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      setVerifyStatus("Verifying code...");

      const res = await fetch(`/api/sites/${selectedSite.siteId}/verify`, { method: "POST" });
      const data = await res.json();

      if (res.ok && data.verified) {
        setIsVerified(true);
        toast.success("Domain verified successfully!");
        setVerifyStatus("");
        if (selectedSite) loadPreviewOnce(selectedSite, config);
      } else {
        setIsVerified(false);
        setVerifyStatus(data.message || "Not verified yet - please ensure script is in the <head>");
        toast.error("Verification failed");
      }
    } catch (err) {
      setVerifyStatus("Verification error");
      setIsVerified(false);
    }
  };

  const getInstallCode = () => {
    if (!selectedSite) return "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") || "";
    const scriptSrc = r2Base ? `${r2Base}/${getScriptPath(selectedSite.siteId, false)}` : `${baseUrl}/cdn/sites/${selectedSite.siteId}/script.js`;
    return [
      "<!-- Start Cookie Access banner -->",
      `<script id="consentflow" src="${scriptSrc}"></script>`,
      "<!-- End Cookie Access banner -->",
    ].join("\n");
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
        title="Banner Setup"
        description="Design and configure your privacy banner to match your platform's aesthetic."
        action={
          canCustomizeBanner && (
            <Button onClick={handleSave} disabled={saving || !selectedSite} className="rounded-xl px-5 h-10 font-medium bg-slate-900 shadow-sm transition-all hover:bg-slate-800">
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          )
        }
      />

      {sites.length === 0 ? (
        <SectionCard hoverLift>
          <EmptyState
            icon={LayoutTemplate}
            title="Design Dashboard"
            description="Add your first domain to begin configuring your consent banner."
          />
          <div className="text-center pb-6">
            <Button asChild className="rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700">
              <Link href="/dashboard/domains"><Plus className="w-4 h-4 mr-2" /> Add Domain</Link>
            </Button>
          </div>
        </SectionCard>
      ) : (
        <div className="flex flex-col xl:flex-row gap-6 pb-12">
          {/* Main Configuration Area */}
          <div className="flex-1 space-y-6">

            {!isVerified && selectedSite && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                <div>
                  <h3 className="text-[16px] font-bold text-amber-900 flex items-center gap-2">
                    Script Not Verified <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider">Action Needed</span>
                  </h3>
                  <p className="text-[13px] text-amber-700 mt-1 font-medium">Please install the tracking code to activate the banner on your website.</p>
                </div>
                <Button onClick={() => setShowInstall(true)} className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-semibold h-9">
                  Install & Verify
                </Button>
              </div>
            )}

            {/* Design & Position Options */}
            {canCustomizeBanner ? (
              <SectionCard>
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <PaintBucket className="w-5 h-5 text-indigo-600" /> Theme & Appearance
                  </h3>
                  <p className="text-[13px] text-slate-500 font-medium mt-1">Select a starting preset or build your own aesthetic.</p>
                </div>

                <div className="p-6 space-y-8">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Presets</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {DESIGN_PRESETS.map((preset) => {
                        const isActive = config.backgroundColor === preset.backgroundColor && config.buttonColor === preset.buttonColor;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => setConfig({
                              ...config,
                              backgroundColor: preset.backgroundColor,
                              textColor: preset.textColor,
                              buttonColor: preset.buttonColor,
                              buttonTextColor: preset.buttonTextColor,
                            })}
                            className={cn(
                              "p-4 rounded-xl border text-left transition-all",
                              isActive ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                            )}
                          >
                            <div className="flex gap-2 mb-3">
                              <span className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.backgroundColor }} />
                              <span className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.buttonColor }} />
                            </div>
                            <span className={cn("text-[13px] font-bold block", isActive ? "text-indigo-900" : "text-slate-700")}>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-3">Color Tokens</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Background", key: "backgroundColor" },
                        { label: "Text Color", key: "textColor" },
                        { label: "Button primary", key: "buttonColor" },
                        { label: "Button Text", key: "buttonTextColor" },
                      ].map((item) => (
                        <div key={item.key} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center gap-3">
                          <input
                            type="color"
                            value={config[item.key]}
                            onChange={(e) => setConfig({ ...config, [item.key]: e.target.value })}
                            className="w-8 h-8 rounded shrink-0 cursor-pointer overflow-hidden bg-transparent p-0 border-0"
                          />
                          <div className="flex-1 min-w-0">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{item.label}</label>
                            <input
                              type="text"
                              value={config[item.key]}
                              onChange={(e) => setConfig({ ...config, [item.key]: e.target.value })}
                              className="w-full text-[13px] font-mono bg-transparent outline-none uppercase text-slate-900 font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-3">Placement</p>
                    <div className="flex flex-wrap gap-2">
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => setConfig({ ...config, position: pos.id })}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[13px] font-medium",
                            config.position === pos.id ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <span className={cn("opacity-80", config.position === pos.id ? "text-indigo-600" : "text-slate-400")}>{pos.icon}</span> {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            ) : (
              <SectionCard className="border-amber-200 bg-amber-50">
                <div className="p-6 text-center">
                  <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-[16px] font-bold text-amber-900 mb-2">Customization Locked</h3>
                  <p className="text-[14px] font-medium text-amber-700 mb-6">{cannotCustomizeReason || "You must select a premium tier to uniquely brand this domain."}</p>
                  <Button asChild className="rounded-xl font-bold tracking-wide shadow-sm" variant="default">
                    <Link href={`/plans?siteId=${selectedSite?.siteId}&domain=${selectedSite?.domain}`}>View Premium Options</Link>
                  </Button>
                </div>
              </SectionCard>
            )}

            {/* Content Options */}
            {canCustomizeBanner && (
              <SectionCard>
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-indigo-600" /> Copy & Labels
                  </h3>
                  <p className="text-[13px] text-slate-500 font-medium mt-1">Configure localized text values spanning the banner.</p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Headline</label>
                      <Input
                        value={config.title ?? ""}
                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                        className="rounded-xl h-11 bg-slate-50 font-medium text-[14px] shadow-sm border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Description text</label>
                      <textarea
                        value={config.description ?? ""}
                        onChange={(e) => setConfig({ ...config, description: e.target.value })}
                        rows={3}
                        className="w-full rounded-xl p-3 bg-slate-50 font-medium text-[13px] text-slate-700 shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Primary Action</label>
                      <Input
                        value={config.acceptText ?? ""}
                        onChange={(e) => setConfig({ ...config, acceptText: e.target.value })}
                        className="rounded-xl h-11 bg-indigo-50/50 border-indigo-100 font-semibold text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Secondary Action</label>
                      <Input
                        value={config.rejectText ?? ""}
                        onChange={(e) => setConfig({ ...config, rejectText: e.target.value })}
                        className="rounded-xl h-11 bg-slate-50 border-slate-200 font-medium text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

          </div>

          {/* Right Sidebar - Preview & Integration */}
          <div className="w-full xl:w-[450px] space-y-6">
            <SectionCard noPadding className="overflow-hidden lg:sticky lg:top-8 shadow-md">
              <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-800 border border-slate-700 rounded flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-200 tracking-wider uppercase">Live Preview</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedSite && loadPreviewOnce(selectedSite, config)}
                  disabled={!selectedSite || previewLoading}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 text-[11px] rounded uppercase font-bold tracking-wider"
                >
                  Reload Simulator
                </Button>
              </div>

              <div className="relative bg-white aspect-4/3 flex flex-col items-center justify-center border-b border-slate-100 overflow-hidden">
                {previewLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {previewError ? (
                  <div className="text-center p-6">
                    <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <span className="text-[14px] font-medium text-slate-500">{previewError}</span>
                  </div>
                ) : previewHtml ? (
                  <iframe
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={previewHtml}
                  />
                ) : (
                  // Fallback dummy view
                  <div className="w-full h-full bg-slate-50 p-6 flex flex-col">
                    <div className="w-32 h-6 bg-slate-200 rounded-md mb-6" />
                    <div className="w-full h-4 bg-slate-200 rounded mb-2" />
                    <div className="w-3/4 h-4 bg-slate-200 rounded mb-8" />

                    <div className="w-full h-48 bg-slate-200/50 rounded-xl mb-6" />

                    {/* Fallback Banner visualization if iframe fails or is empty initially */}
                    <div className={cn(
                      "absolute max-w-sm rounded-[14px] shadow-xl p-5 border border-black/5 animate-in fade-in slide-in-from-bottom-4 duration-500",
                      config.position === "bottom" ? "bottom-4 left-4 right-4 max-w-none mx-auto w-[calc(100%-32px)]" :
                        config.position === "top" ? "top-4 left-4 right-4 max-w-none mx-auto w-[calc(100%-32px)]" :
                          config.position === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4"
                    )} style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
                      <p className="font-bold text-[14px] mb-1.5">{config.title}</p>
                      <p className="font-medium text-[12px] opacity-80 mb-4 leading-relaxed">{config.description}</p>
                      <div className="flex gap-2.5">
                        <div className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold shadow-sm" style={{ backgroundColor: config.buttonColor, color: config.buttonTextColor }}>
                          {config.acceptText}
                        </div>
                        {config.showRejectButton && (
                          <div className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold border border-current opacity-70">
                            {config.rejectText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Setup</span>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 uppercase tracking-widest px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 uppercase tracking-widest px-2 py-0.5 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <Button onClick={() => setShowInstall(true)} variant="outline" className="w-full rounded-lg border-slate-200 shadow-sm h-10 font-medium text-slate-700 hover:bg-white text-[13px]">
                  View Installation Code
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Installation Dialog */}
      <Dialog open={!!(showInstall && selectedSite)} onOpenChange={(open) => !open && setShowInstall(false)}>
        <DialogContent className="max-w-3xl p-0 mx-auto  border-0 shadow-2xl rounded-2xl bg-slate-50">
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-5">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Connect Infrastructure
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-1 font-medium">
              Deploy the tracking module directly into your codebase or tag manager.
            </DialogDescription>
          </div>

          <div className="p-6">
            <div className="flex gap-2 p-1.5 rounded-xl bg-slate-200/50 border border-slate-200 mb-6">
              <button
                onClick={() => setActiveInstallTab("manual")}
                className={cn("flex-1 py-2 text-[13px] font-bold rounded-lg transition-all", activeInstallTab === "manual" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700")}
              >
                Raw Install
              </button>
              <button
                onClick={() => setActiveInstallTab("gtm")}
                className={cn("flex-1 py-2 text-[13px] font-bold rounded-lg transition-all", activeInstallTab === "gtm" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700")}
              >
                Google Tag Manager
              </button>
            </div>

            {activeInstallTab === "manual" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold font-mono text-sm shrink-0">1</div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 mb-1">Insert Snippet</p>
                    <p className="text-[13px] text-slate-600 font-medium">Place this module in your <code className="text-xs bg-slate-200/70 px-1 rounded text-slate-800">{'<head>'}</code> tag, preferably at the very beginning.</p>
                  </div>
                </div>

                <div className="relative group">
                  <pre className="p-5 rounded-xl bg-slate-900 border-2 border-slate-800 text-slate-300 font-mono text-[13px] overflow-x-auto selection:bg-indigo-500/30 text-wrap break-all">
                    {getInstallCode()}
                  </pre>
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getInstallCode());
                      toast.success("Snippet copied to clipboard");
                    }}
                    size="sm"
                    className="absolute top-4 right-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[11px] font-bold uppercase tracking-widest shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-mono text-sm shrink-0">1</div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 mb-1">GTM Template Keys</p>
                    <p className="text-[13px] text-slate-600 font-medium">Use this unique identifier when setting up the ConsentFlow template within Google Tag Manager.</p>
                  </div>
                </div>

                <div className="relative group">
                  <div className="p-5 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 font-mono text-[16px] overflow-x-auto text-center font-bold tracking-widest items-center justify-center select-all">
                    {selectedSite?.siteId}
                  </div>
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(selectedSite?.siteId);
                      toast.success("Key copied to clipboard");
                    }}
                    size="sm"
                    className="absolute top-1/2 -translate-y-1/2 right-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-[11px] font-bold uppercase tracking-widest shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Copy Key
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              {!isVerified ? (
                <div className="space-y-4">
                  <Button onClick={handleVerify} className="h-12 px-8 rounded-xl font-bold tracking-wide shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto mx-auto text-[15px]">
                    Test Installation
                  </Button>
                  {verifyStatus && (
                    <p className="text-[13px] font-bold text-amber-600 animate-pulse">{verifyStatus}</p>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[14px] font-bold tracking-wide">Infrastructure Confirmed Active</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function BannerPage() {
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
      <BannerContent />
    </Suspense>
  );
}
