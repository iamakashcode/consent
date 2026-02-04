"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { getScriptPath } from "@/lib/script-urls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, CheckCircle2 } from "lucide-react";

const POSITIONS = [
  { id: "bottom", label: "Bottom", icon: "⬇️" },
  { id: "top", label: "Top", icon: "⬆️" },
  { id: "bottom-left", label: "Bottom Left", icon: "↙️" },
  { id: "bottom-right", label: "Bottom Right", icon: "↘️" },
];

// 3–4 preset designs: only colors + position (same shape as config). Script unchanged.
const DESIGN_PRESETS = [
  {
    id: "minimal",
    name: "Minimal",
    backgroundColor: "#1F2937",
    textColor: "#F9FAFB",
    buttonColor: "#4F46E5",
    buttonTextColor: "#FFFFFF",
    position: "bottom",
  },
  {
    id: "modern",
    name: "Modern",
    backgroundColor: "#667eea",
    textColor: "#FFFFFF",
    buttonColor: "#FFFFFF",
    buttonTextColor: "#667eea",
    position: "bottom",
  },
  {
    id: "elegant",
    name: "Elegant",
    backgroundColor: "#FFFFFF",
    textColor: "#1F2937",
    buttonColor: "#1F2937",
    buttonTextColor: "#FFFFFF",
    position: "bottom",
  },
  {
    id: "dark",
    name: "Dark",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    buttonColor: "#FFFFFF",
    buttonTextColor: "#000000",
    position: "bottom",
  },
];

const DEFAULT_CONFIG = {
  backgroundColor: "#1F2937",
  textColor: "#F9FAFB",
  buttonColor: "#4F46E5",
  buttonTextColor: "#FFFFFF",
  position: "bottom",
  title: "We value your privacy",
  description: "We use cookies to enhance your browsing experience and analyze site traffic.",
  acceptText: "Accept All",
  rejectText: "Reject All",
  customizeText: "Customize",
  showRejectButton: true,
  showCustomizeButton: true,
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
  const [copyStatus, setCopyStatus] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("");
  const [isVerified, setIsVerified] = useState(false);
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
      } else {
        setSiteStats({ totalViews: 0, totalUniquePages: 0 });
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
    return value
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .trim();
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

    // Ensure script is placed before </body> or at the end, and executes immediately
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
      if (html) {
        setPreviewHtml(html);
      }
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
        // Fetch sites and subscriptions
        const [sitesRes, subsRes] = await Promise.all([
          fetch("/api/sites"),
          fetch("/api/subscription"),
        ]);

        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          let activeSites = [];

          // Get subscription data to filter only active domains
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            const subscriptionsMap = {};
            (subsData.subscriptions || []).forEach((item) => {
              subscriptionsMap[item.siteId] = {
                ...item,
                userTrialActive: subsData.userTrialActive || false,
              };
            });

            // Filter sites that have active subscriptions or user trial
            activeSites = sitesData.filter(site => {
              const subData = subscriptionsMap[site.siteId];
              return subData?.isActive || subsData.userTrialActive;
            });
          } else {
            // If subscription API fails, show all sites (fallback)
            activeSites = sitesData;
          }

          setSites(activeSites);

          // Only allow siteId from URL if it's in active (verified/paid) list - no URL hack without payment
          const siteIdParam = searchParams?.get("siteId");
          let nextSite = null;

          if (siteIdParam && activeSites.length > 0) {
            nextSite = activeSites.find(s => s.siteId === siteIdParam || s.id === siteIdParam);
            // If URL has siteId but not in active list, clear it from URL (user can't access without payment)
            if (!nextSite && typeof window !== "undefined") {
              const u = new URL(window.location.href);
              u.searchParams.delete("siteId");
              window.history.replaceState({}, "", u.pathname + u.search);
            }
          }

          if (!nextSite && activeSites.length > 0) {
            nextSite = activeSites[0];
          }

          if (nextSite) {
            setSelectedSite(nextSite);
            selectedSiteRef.current = nextSite;
            fetchSiteStats(nextSite.siteId);
            let initialConfig = DEFAULT_CONFIG;
            if (nextSite?.bannerConfig) {
              const parsedConfig = typeof nextSite.bannerConfig === "string"
                ? JSON.parse(nextSite.bannerConfig)
                : nextSite.bannerConfig;
              initialConfig = { ...DEFAULT_CONFIG, ...parsedConfig };
            }
            setConfig(initialConfig);
            setDebouncedConfig(initialConfig);
            loadPreviewOnce(nextSite, initialConfig);
            // Check whether customization is allowed (subscription + view limit)
            fetch(`/api/sites/${nextSite.siteId}/can-customize`)
              .then((res) => res.ok ? res.json() : { canCustomize: true })
              .then((data) => {
                setCanCustomizeBanner(!!data.canCustomize);
                setCannotCustomizeReason(data.reason || "");
              })
              .catch(() => {
                setCanCustomizeBanner(true);
                setCannotCustomizeReason("");
              });
            // Check verification status
            checkVerificationStatus(nextSite.siteId);
          }
        }
      } catch (err) {
        console.error("Error fetching sites:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSitesOnce();
  }, [status, loadPreviewOnce, searchParams, fetchSiteStats]);

  // Refetch sites when returning from add-on purchase so subscription.removeBrandingAddon is updated
  useEffect(() => {
    if (searchParams?.get("addon") !== "success") return;
    let cancelled = false;
    fetch("/api/sites")
      .then((r) => r.json())
      .then((sitesData) => {
        if (cancelled || !Array.isArray(sitesData)) return;
        setSites((prev) =>
          prev.map((s) => {
            const updated = sitesData.find((n) => n.siteId === s.siteId);
            return updated ? { ...s, ...updated } : s;
          })
        );
        setSelectedSite((current) => {
          const updated = sitesData.find((s) => s.siteId === current?.siteId);
          return updated ? { ...current, ...updated } : current;
        });
      })
      .finally(() => {
        if (!cancelled && typeof window !== "undefined") {
          const u = new URL(window.location.href);
          u.searchParams.delete("addon");
          window.history.replaceState({}, "", u.pathname + u.search);
        }
      });
    return () => { cancelled = true; };
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConfig(config);
    }, 350);
    return () => clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    if (!previewSourceHtml || !selectedSite) return;
    const html = buildPreviewHtml(previewSourceHtml, selectedSite.domain, selectedSite.siteId, debouncedConfig);
    if (html) {
      setPreviewHtml(html);
    }
  }, [buildPreviewHtml, debouncedConfig, previewSourceHtml, selectedSite]);

  const handleSiteChange = (siteId) => {
    const site = sites.find((s) => s.siteId === siteId);
    if (site) {
      setSelectedSite(site);
      selectedSiteRef.current = site;
      fetchSiteStats(site.siteId);
      setCanCustomizeBanner(true);
      setCannotCustomizeReason("");
      let newConfig = DEFAULT_CONFIG;
      if (site.bannerConfig) {
        const parsedConfig = typeof site.bannerConfig === "string"
          ? JSON.parse(site.bannerConfig)
          : site.bannerConfig;
        newConfig = {
          ...DEFAULT_CONFIG,
          ...parsedConfig,
          description: parsedConfig.description ?? parsedConfig.message ?? DEFAULT_CONFIG.description,
          acceptText: parsedConfig.acceptText ?? parsedConfig.acceptButtonText ?? DEFAULT_CONFIG.acceptText,
          rejectText: parsedConfig.rejectText ?? parsedConfig.rejectButtonText ?? DEFAULT_CONFIG.rejectText,
          customizeText: parsedConfig.customizeText ?? parsedConfig.customizeButtonText ?? DEFAULT_CONFIG.customizeText,
          showRejectButton: parsedConfig.showRejectButton ?? (parsedConfig.showReject !== false),
          showCustomizeButton: parsedConfig.showCustomizeButton ?? true,
        };
      }
      setConfig(newConfig);
      setDebouncedConfig(newConfig);
      loadPreviewOnce(site, newConfig);
      // Fetch whether customization is allowed (subscription + view limit)
      fetch(`/api/sites/${site.siteId}/can-customize`)
        .then((res) => res.ok ? res.json() : { canCustomize: true })
        .then((data) => {
          setCanCustomizeBanner(!!data.canCustomize);
          setCannotCustomizeReason(data.reason || "");
        })
        .catch(() => {
          setCanCustomizeBanner(true);
          setCannotCustomizeReason("");
        });
    }
  };

  const handleSave = async () => {
    if (!selectedSite) return;

    setSaving(true);
    try {
      // Save full schema for DB: include message (script) + description (UI), all button options
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
        alert("Banner settings saved successfully!");
        setSites((prev) =>
          prev.map((s) =>
            s.siteId === selectedSite.siteId ? { ...s, bannerConfig } : s
          )
        );
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save settings");
      }
    } catch (err) {
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset to default settings?")) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  const handlePurchaseBrandingAddon = async () => {
    if (!selectedSite) return;
    setAddonCheckoutLoading(true);
    try {
      const res = await fetch("/api/payment/create-addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: selectedSite.siteId, addonType: "remove_branding" }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      alert(data.error || "Failed to start checkout");
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setAddonCheckoutLoading(false);
    }
  };

  const getInstallCode = () => {
    if (!selectedSite) return "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") || "";
    const scriptSrc = r2Base
      ? `${r2Base}/${getScriptPath(selectedSite.siteId, false)}`
      : `${baseUrl}/cdn/sites/${selectedSite.siteId}/script.js`;
    return [
      "<!-- CRITICAL: Place this script FIRST in <head>, BEFORE any Meta Pixel, Google Analytics, or other tracker scripts -->",
      "<!-- Start ConsentFlow banner -->",
      `<script id="consentflow" src="${scriptSrc}"></script>`,
      "<!-- End ConsentFlow banner -->",
      "<!-- Example: Place ConsentFlow script BEFORE Meta Pixel -->",
      "<!-- <script id=\"consentflow\" src=\"...\"></script> -->",
      "<!-- <script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){...} }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');</script> -->",
    ].join("\n");
  };

  const handleCopyCode = async () => {
    const code = getInstallCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  const checkVerificationStatus = async (siteId) => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/sites/${siteId}/verify`);
      if (res.ok) {
        const data = await res.json();
        setIsVerified(data.isVerified || false);
        if (data.isVerified) {
          setVerifyStatus("Verified ✓");
        }
      }
    } catch (err) {
      console.error("Error checking verification:", err);
    }
  };

  const handleVerify = async () => {
    if (!selectedSite) return;
    setVerifyStatus("Crawling website...");
    try {
      // First, re-crawl the website to check if script is installed
      const crawlRes = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedSite.domain }),
      });

      if (!crawlRes.ok) {
        setVerifyStatus("Crawl failed");
        return;
      }

      // Wait a bit for script to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Then check verification status
      setVerifyStatus("Checking verification...");
      const res = await fetch(`/api/sites/${selectedSite.siteId}/verify`, { method: "POST" });
      const data = await res.json();

      if (res.ok && data.verified) {
        setIsVerified(true);
        setVerifyStatus("Verified ✓");
        // Reload preview to show verified state
        if (selectedSite) {
          loadPreviewOnce(selectedSite, config);
        }
        // Refresh site data
        const sitesRes = await fetch("/api/sites");
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          const updatedSite = sitesData.find(s => s.siteId === selectedSite.siteId);
          if (updatedSite) {
            setSelectedSite(updatedSite);
            setSites(sitesData);
          }
        }
      } else {
        setIsVerified(false);
        setVerifyStatus(data.message || "Not verified yet - Add script to your website");
      }
    } catch (err) {
      console.error("Verify error:", err);
      setVerifyStatus("Verify failed");
      setIsVerified(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage</h1>
          <p className="text-muted-foreground mt-1">Customize banner, install code, and view stats for this domain</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedSite && !isVerified && (
            <Button size="sm" variant="destructive" className="bg-amber-600 hover:bg-amber-700" onClick={() => setShowInstall(true)}>
              Script not installed — Install & verify
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowInstall(true)} disabled={!selectedSite}>
            Install Code
          </Button>
          {canCustomizeBanner && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400"
                onClick={() => customizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Customize
              </Button>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !selectedSite}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="mb-1">No domains yet</CardTitle>
            <CardDescription className="mb-4">Add a domain first to customize its banner</CardDescription>
            <Button asChild>
              <Link href="/dashboard/domains">Add Domain</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Script not installed / not verified — prominent notice */}
          {selectedSite && !isVerified && (
            <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">Script not installed or not verified</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-0.5">
                      The consent banner will not appear on your website until you install the code and verify. Click &quot;Install Code&quot;, add the code to your site, then click &quot;Verify installation&quot;.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setShowInstall(true)} className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
                  Install Code & verify
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Settings */}
            <div className="space-y-6">
              {/* Domain + Page views & Page count */}
              {selectedSite && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Domain &amp; stats</CardTitle>
                    <CardDescription>Selected domain and consent metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Domain</label>
                      <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm font-medium">
                        {selectedSite.domain}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Page views</p>
                        <p className="text-2xl font-bold mt-1">{siteStats.totalViews.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Page count</p>
                        <p className="text-2xl font-bold mt-1">{siteStats.totalUniquePages.toLocaleString()}</p>
                      </div>
                    </div>
                    {sites.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        <Link href="/dashboard/domains" className="text-primary hover:underline">Manage all domains</Link>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Customization unavailable */}
              {selectedSite && !canCustomizeBanner && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-amber-800">Banner customization unavailable</CardTitle>
                    <CardDescription className="text-amber-700">{cannotCustomizeReason}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" asChild className="border-amber-300 text-amber-800 hover:bg-amber-100">
                      <Link href="/plans">View plans</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Hide branding */}
              {selectedSite && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Hide branding</CardTitle>
                    <CardDescription>
                      {selectedSite.subscription?.removeBrandingAddon
                        ? "Branding is hidden on your consent banner."
                        : '"Powered by Cookie Access" is shown on the banner. Add the add-on to hide it.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedSite.subscription?.removeBrandingAddon ? (
                      <p className="text-sm text-muted-foreground">No action needed.</p>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handlePurchaseBrandingAddon}
                        disabled={addonCheckoutLoading}
                      >
                        {addonCheckoutLoading ? "Loading…" : "Hide branding — EUR 3/month"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Banner customization - Design, Colors, Position, Text, Buttons */}
              {canCustomizeBanner && (
                <>
                  <Card id="banner-customize" ref={customizeSectionRef} className="scroll-mt-6">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">Banner customization</CardTitle>
                          <CardDescription>Design, colors, position, and copy — all options are saved to your domain.</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleSave} disabled={saving || !selectedSite} className="shrink-0">
                          {saving ? "Saving…" : "Save Changes"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* Design presets */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Design</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Pick a preset, then tweak colors and position below if needed.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {DESIGN_PRESETS.map((preset) => {
                            const isActive =
                              config.backgroundColor === preset.backgroundColor &&
                              config.buttonColor === preset.buttonColor &&
                              config.position === preset.position;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setConfig({
                                  ...config,
                                  backgroundColor: preset.backgroundColor,
                                  textColor: preset.textColor,
                                  buttonColor: preset.buttonColor,
                                  buttonTextColor: preset.buttonTextColor,
                                  position: preset.position,
                                })}
                                className={`rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isActive
                                  ? "border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                  }`}
                              >
                                <div className="flex gap-1.5 mb-2">
                                  <span
                                    className="h-7 flex-1 rounded-md"
                                    style={{ backgroundColor: preset.backgroundColor }}
                                    title="Background"
                                  />
                                  <span
                                    className="h-7 w-9 rounded-md"
                                    style={{ backgroundColor: preset.buttonColor }}
                                    title="Button"
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-800">{preset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Colors */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Colors</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Background</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={config.backgroundColor}
                                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                              />
                              <input
                                type="text"
                                value={config.backgroundColor}
                                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Text</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={config.textColor}
                                onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                              />
                              <input
                                type="text"
                                value={config.textColor}
                                onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Button</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={config.buttonColor}
                                onChange={(e) => setConfig({ ...config, buttonColor: e.target.value })}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                              />
                              <input
                                type="text"
                                value={config.buttonColor}
                                onChange={(e) => setConfig({ ...config, buttonColor: e.target.value })}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Button Text</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={config.buttonTextColor}
                                onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                              />
                              <input
                                type="text"
                                value={config.buttonTextColor}
                                onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Position */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Position</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {POSITIONS.map((pos) => (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setConfig({ ...config, position: pos.id })}
                              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${config.position === pos.id
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                              <span>{pos.icon}</span>
                              <span className="text-sm font-medium">{pos.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Text</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Title</label>
                            <Input
                              value={config.title ?? ""}
                              onChange={(e) => setConfig({ ...config, title: e.target.value })}
                              placeholder="e.g. We value your privacy"
                              className="max-w-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                            <textarea
                              value={config.description ?? ""}
                              onChange={(e) => setConfig({ ...config, description: e.target.value })}
                              rows={3}
                              placeholder="Banner body text"
                              className="w-full max-w-md px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Buttons — all options saved to DB */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Buttons</h3>
                        <p className="text-xs text-gray-500">Labels and visibility; all saved with your banner.</p>
                        <div className="space-y-4 max-w-md">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Accept button text</label>
                            <Input
                              value={config.acceptText ?? ""}
                              onChange={(e) => setConfig({ ...config, acceptText: e.target.value })}
                              placeholder="Accept All"
                              className="bg-white"
                            />
                          </div>
                          <div className="flex flex-wrap items-start gap-4">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">Reject button text</label>
                              <Input
                                value={config.rejectText ?? ""}
                                onChange={(e) => setConfig({ ...config, rejectText: e.target.value })}
                                placeholder="Reject All"
                                disabled={!config.showRejectButton}
                                className="bg-white disabled:opacity-60"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-7">
                              <input
                                type="checkbox"
                                checked={config.showRejectButton}
                                onChange={(e) => setConfig({ ...config, showRejectButton: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-600">Show reject</span>
                            </label>
                          </div>
                          <div className="flex flex-wrap items-start gap-4">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">Customize button text</label>
                              <Input
                                value={config.customizeText ?? ""}
                                onChange={(e) => setConfig({ ...config, customizeText: e.target.value })}
                                placeholder="Customize"
                                disabled={!config.showCustomizeButton}
                                className="bg-white disabled:opacity-60"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-7">
                              <input
                                type="checkbox"
                                checked={config.showCustomizeButton}
                                onChange={(e) => setConfig({ ...config, showCustomizeButton: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-600">Show customize</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-24 h-fit">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Live Preview</CardTitle>
                      <CardDescription>
                        {selectedSite?.domain ? `Previewing ${selectedSite.domain}` : "Select a domain"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => selectedSite && loadPreviewOnce(selectedSite, config)}
                      disabled={!selectedSite || previewLoading}
                    >
                      {previewLoading ? "Refreshing…" : "Refresh"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">

                  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: "500px" }}>
                    {previewLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                      </div>
                    )}

                    {previewError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="text-center px-6">
                          <p className="text-sm font-medium text-gray-900 mb-1">Preview unavailable</p>
                          <p className="text-xs text-gray-500">{previewError}</p>
                        </div>
                      </div>
                    )}

                    {previewHtml ? (
                      <iframe
                        title="Live banner preview"
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        srcDoc={previewHtml}
                        style={{ border: 'none' }}
                      />
                    ) : (
                      <>
                        {/* Simulated webpage */}
                        <div className="absolute inset-0 p-4">
                          <div className="bg-white h-full rounded-lg shadow-sm p-4">
                            <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                            <div className="space-y-2">
                              <div className="h-3 w-full bg-gray-100 rounded"></div>
                              <div className="h-3 w-5/6 bg-gray-100 rounded"></div>
                              <div className="h-3 w-4/6 bg-gray-100 rounded"></div>
                            </div>
                            <div className="h-32 bg-gray-50 rounded mt-4"></div>
                            <div className="space-y-2 mt-4">
                              <div className="h-3 w-full bg-gray-100 rounded"></div>
                              <div className="h-3 w-3/4 bg-gray-100 rounded"></div>
                            </div>
                          </div>
                        </div>

                        {/* Banner Preview */}
                        <div
                          className={`absolute left-0 right-0 p-4 ${config.position === "top"
                            ? "top-0"
                            : config.position === "bottom-left"
                              ? "bottom-0 left-0 right-auto max-w-sm"
                              : config.position === "bottom-right"
                                ? "bottom-0 right-0 left-auto max-w-sm"
                                : "bottom-0"
                            }`}
                        >
                          <div
                            className="rounded-lg p-4 shadow-lg"
                            style={{
                              backgroundColor: config.backgroundColor,
                              color: config.textColor,
                            }}
                          >
                            <h4 className="font-semibold text-sm mb-1" style={{ color: config.textColor }}>
                              {config.title}
                            </h4>
                            <p className="text-xs opacity-90 mb-3" style={{ color: config.textColor }}>
                              {config.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="px-3 py-1.5 text-xs font-medium rounded"
                                style={{
                                  backgroundColor: config.buttonColor,
                                  color: config.buttonTextColor,
                                }}
                              >
                                {config.acceptText}
                              </button>
                              {config.showRejectButton && (
                                <button
                                  className="px-3 py-1.5 text-xs font-medium rounded border"
                                  style={{
                                    borderColor: config.textColor,
                                    color: config.textColor,
                                    backgroundColor: "transparent",
                                  }}
                                >
                                  {config.rejectText}
                                </button>
                              )}
                              {config.showCustomizeButton && (
                                <button
                                  className="px-3 py-1.5 text-xs font-medium"
                                  style={{ color: config.textColor }}
                                >
                                  {config.customizeText}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!(showInstall && selectedSite)} onOpenChange={(open) => !open && setShowInstall(false)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Install code</DialogTitle>
            <DialogDescription className="text-sm">
              Add the code to your website, then verify. Until then the banner will not appear.
            </DialogDescription>
          </DialogHeader>

          {/* Warning */}
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
            <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-200 font-bold text-xs">!</div>
            <div className="min-w-0 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold">Script not installed</p>
              <p className="mt-0.5 opacity-90">Paste the code right after <code className="bg-amber-200/50 dark:bg-amber-800/50 px-1 rounded">&lt;head&gt;</code>, then click &quot;Verify installation&quot;.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/60 border">
            <button
              type="button"
              onClick={() => setActiveInstallTab("manual")}
              className={`flex-1 min-w-0 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${activeInstallTab === "manual"
                ? "bg-background shadow-sm text-foreground border"
                : "text-muted-foreground hover:text-foreground"}`}
            >
              Install manually
            </button>
            <button
              type="button"
              onClick={() => setActiveInstallTab("gtm")}
              className={`flex-1 min-w-0 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${activeInstallTab === "gtm"
                ? "bg-background shadow-sm text-foreground border"
                : "text-muted-foreground hover:text-foreground"}`}
            >
              Google Tag Manager
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {activeInstallTab === "manual" ? (
              <>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Step 1 — Copy the code</p>
                  <p className="text-xs text-muted-foreground mb-2">Step 2 — Paste it right after the opening &lt;head&gt; tag on your site</p>
                  <div className="rounded-lg border bg-muted/50 overflow-hidden">
                    <pre className="text-[11px] sm:text-xs overflow-auto whitespace-pre-wrap font-mono p-4 max-h-[220px] sm:max-h-[280px]">
                      {getInstallCode()}
                    </pre>
                  </div>
                  <Button className="w-full sm:w-auto mt-2" size="sm" onClick={handleCopyCode}>
                    {copyStatus || "Copy code"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Add this site key to your ConsentFlow CMP template in GTM, then publish and verify.</p>
                <div className="rounded-lg border bg-muted/50 p-4 break-all text-sm font-mono select-all">
                  {selectedSite?.siteId}
                </div>
              </>
            )}
          </div>

          {/* Verify section — clear status */}
          <div className="rounded-xl border-2 bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Verification</p>
            {!isVerified ? (
              <>
                <p className="text-sm text-muted-foreground">
                  After adding the code to your site, click the button below to verify. Once verified, the banner will work on your website.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button size="sm" onClick={handleVerify} className="sm:shrink-0">
                    Verify installation
                  </Button>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden />
                    {verifyStatus || "Not verified yet"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm font-medium text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <span>Domain verified — script is live on your site</span>
              </div>
            )}
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </DashboardLayout>
      }
    >
      <BannerContent />
    </Suspense>
  );
}
