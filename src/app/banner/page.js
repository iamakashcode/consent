"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";

const POSITIONS = [
  { id: "bottom", label: "Bottom", icon: "⬇️" },
  { id: "top", label: "Top", icon: "⬆️" },
  { id: "bottom-left", label: "Bottom Left", icon: "↙️" },
  { id: "bottom-right", label: "Bottom Right", icon: "↘️" },
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
  const selectedSiteRef = useRef(null);
  const hasFetchedRef = useRef(false);

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
          
          // Check if siteId is provided in URL
          const siteIdParam = searchParams?.get("siteId");
          let nextSite = null;
          
          if (siteIdParam && activeSites.length > 0) {
            // Find site by siteId
            nextSite = activeSites.find(s => s.siteId === siteIdParam || s.id === siteIdParam);
          }
          
          // Fallback to first active site if no match or no param
          if (!nextSite && activeSites.length > 0) {
            nextSite = activeSites[0];
          }
          
          if (nextSite) {
            setSelectedSite(nextSite);
            selectedSiteRef.current = nextSite;
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
  }, [status, loadPreviewOnce, searchParams]);

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
      let newConfig = DEFAULT_CONFIG;
      if (site.bannerConfig) {
        const parsedConfig = typeof site.bannerConfig === "string"
          ? JSON.parse(site.bannerConfig)
          : site.bannerConfig;
        newConfig = { ...DEFAULT_CONFIG, ...parsedConfig };
      }
      setConfig(newConfig);
      setDebouncedConfig(newConfig);
      loadPreviewOnce(site, newConfig);
    }
  };

  const handleSave = async () => {
    if (!selectedSite) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/sites/${selectedSite.siteId}/banner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerConfig: config }),
      });

      if (response.ok) {
        alert("Banner settings saved successfully!");
        // Update local site bannerConfig so it reflects saved state
        setSites((prev) =>
          prev.map((s) =>
            s.siteId === selectedSite.siteId ? { ...s, bannerConfig: config } : s
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

  const getInstallCode = () => {
    if (!selectedSite) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return [
      "<!-- Start ConsentFlow banner -->",
      `<script id="consentflow" src="${baseUrl}/api/script/${selectedSite.siteId}?domain=${encodeURIComponent(selectedSite.domain)}" async></script>`,
      "<!-- End ConsentFlow banner -->",
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header without Sidebar */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
        <div className="h-full flex items-center justify-between px-4 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">ConsentFlow</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner Customization</h1>
          <p className="text-gray-500 mt-1">Customize your consent banner appearance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInstall(true)}
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Install Code
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedSite}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No domains yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add a domain first to customize its banner</p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Domain
          </a>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Domain Info */}
            {selectedSite && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                  {selectedSite.domain}
                </div>
                {sites.length > 1 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Showing banner for this domain only. <Link href="/dashboard" className="text-indigo-600 hover:underline">Manage all domains</Link>
                  </p>
                )}
              </div>
            )}

            {/* Colors */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Colors</h3>
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Position</h3>
              <div className="grid grid-cols-2 gap-3">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setConfig({ ...config, position: pos.id })}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      config.position === pos.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span>{pos.icon}</span>
                    <span className="text-sm font-medium">{pos.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Text</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Title</label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Description</label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Buttons</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Accept Button Text</label>
                  <input
                    type="text"
                    value={config.acceptText}
                    onChange={(e) => setConfig({ ...config, acceptText: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">Reject Button Text</label>
                    <input
                      type="text"
                      value={config.rejectText}
                      onChange={(e) => setConfig({ ...config, rejectText: e.target.value })}
                      disabled={!config.showRejectButton}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={config.showRejectButton}
                      onChange={(e) => setConfig({ ...config, showRejectButton: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">Show</span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">Customize Button Text</label>
                    <input
                      type="text"
                      value={config.customizeText}
                      onChange={(e) => setConfig({ ...config, customizeText: e.target.value })}
                      disabled={!config.showCustomizeButton}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={config.showCustomizeButton}
                      onChange={(e) => setConfig({ ...config, showCustomizeButton: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">Show</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
                  <p className="text-xs text-gray-500">
                    {selectedSite?.domain ? `Previewing ${selectedSite.domain}` : "Select a domain"}
                  </p>
                </div>
                <button
                  onClick={() => selectedSite && loadPreviewOnce(selectedSite, config)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={!selectedSite || previewLoading}
                >
                  {previewLoading ? "Refreshing..." : "Refresh Preview"}
                </button>
              </div>

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
                      className={`absolute left-0 right-0 p-4 ${
                        config.position === "top"
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
            </div>
          </div>
        </div>
      )}

      {showInstall && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="w-full max-w-3xl bg-white rounded-xl border border-gray-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Installation</h2>
                <p className="text-sm text-gray-500">Connect banner to your website</p>
              </div>
              <button
                onClick={() => setShowInstall(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                ConsentFlow installation code isn’t added to your site.
              </div>
            </div>

            <div className="px-6 pt-4">
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveInstallTab("manual")}
                  className={`pb-3 text-sm font-medium ${
                    activeInstallTab === "manual"
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-gray-500"
                  }`}
                >
                  Install manually on website
                </button>
                <button
                  onClick={() => setActiveInstallTab("gtm")}
                  className={`pb-3 text-sm font-medium ${
                    activeInstallTab === "gtm"
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-gray-500"
                  }`}
                >
                  Install with Google Tag Manager
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {activeInstallTab === "manual" ? (
                <>
                  <p className="text-sm text-gray-700 mb-3">
                    Step 1: Copy this banner installation code.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
{getInstallCode()}
                    </pre>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleCopyCode}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {copyStatus ? copyStatus : "Copy code"}
                    </button>
                    <p className="text-xs text-gray-500">
                      Step 2: Paste the code right after the opening &lt;head&gt; tag.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-3">
                    Step 1: Add this website key to your ConsentFlow CMP template in GTM.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                    {selectedSite.siteId}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Step 2: Publish your container and refresh verification.
                  </p>
                </>
              )}
            </div>

            <div className="px-6 pb-6">
              {!isVerified ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Verify
                  </button>
                  <span className="text-sm text-gray-600">{verifyStatus || "Click to verify installation"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">Domain verified successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default function BannerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      }
    >
      <BannerContent />
    </Suspense>
  );
}
