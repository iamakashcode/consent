"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { BANNER_TEMPLATES, DEFAULT_BANNER_CONFIG } from "@/lib/banner-templates";
import Link from "next/link";

export default function BannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [bannerConfig, setBannerConfig] = useState(DEFAULT_BANNER_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSites();
    }
  }, [session]);

  useEffect(() => {
    if (selectedSite && selectedSite.bannerConfig) {
      setBannerConfig(selectedSite.bannerConfig);
    } else {
      setBannerConfig(DEFAULT_BANNER_CONFIG);
    }
  }, [selectedSite]);

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/sites");
      if (response.ok) {
        const data = await response.json();
        setSites(data);
        if (data.length > 0 && !selectedSite) {
          setSelectedSite(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = BANNER_TEMPLATES[templateId];
    setBannerConfig({
      ...bannerConfig,
      template: templateId,
      position: template.position,
    });
  };

  const handleSave = async () => {
    if (!selectedSite) {
      alert("Please select a site first");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/banner`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bannerConfig }),
      });

      if (response.ok) {
        alert("Banner settings saved successfully!\n\nNote: If changes don't appear immediately, clear your browser cache or do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R). The script cache expires after 60 seconds.");
        fetchSites(); // Refresh sites
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save banner settings");
      }
    } catch (err) {
      console.error("Failed to save:", err);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentPlan = session.user?.plan || "free";
  const hasBannerAccess = currentPlan === "starter" || currentPlan === "pro";

  if (!hasBannerAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Banner Customization
            </h1>
            <p className="text-gray-600 mb-6">
              Banner customization is available for Starter and Pro plans only.
            </p>
            <Link
              href="/plans"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Upgrade Your Plan
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const selectedTemplate = BANNER_TEMPLATES[bannerConfig.template] || BANNER_TEMPLATES.minimal;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Banner Customization
          </h1>
          <p className="text-gray-600">
            Customize your cookie consent banner design and messaging
          </p>
        </div>

        {/* Site Selection */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Site
          </label>
          <select
            value={selectedSite?.id || ""}
            onChange={(e) => {
              const site = sites.find((s) => s.id === e.target.value);
              setSelectedSite(site);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.domain}
              </option>
            ))}
          </select>
        </div>

        {selectedSite && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Template Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Choose Design Template
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(BANNER_TEMPLATES).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        bannerConfig.template === template.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900 mb-1">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Settings */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Banner Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <select
                      value={bannerConfig.position}
                      onChange={(e) =>
                        setBannerConfig({
                          ...bannerConfig,
                          position: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="bottom">Bottom</option>
                      <option value="top">Top</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={bannerConfig.title || ""}
                      onChange={(e) =>
                        setBannerConfig({
                          ...bannerConfig,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="🍪 We use cookies"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={bannerConfig.message || ""}
                      onChange={(e) =>
                        setBannerConfig({
                          ...bannerConfig,
                          message: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="This site uses tracking cookies..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accept Button Text
                    </label>
                    <input
                      type="text"
                      value={bannerConfig.acceptButtonText || ""}
                      onChange={(e) =>
                        setBannerConfig({
                          ...bannerConfig,
                          acceptButtonText: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Accept"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reject Button Text
                    </label>
                    <input
                      type="text"
                      value={bannerConfig.rejectButtonText || ""}
                      onChange={(e) =>
                        setBannerConfig({
                          ...bannerConfig,
                          rejectButtonText: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Reject"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showReject"
                      checked={bannerConfig.showRejectButton !== false}
                      onChange={(e) =>
                        setBannerConfig({
                          ...bannerConfig,
                          showRejectButton: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="showReject"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Show Reject Button
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Banner Settings"}
              </button>
            </div>

            {/* Preview Panel */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Preview</h2>
                <button
                  onClick={() => setPreview(!preview)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {preview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>

              {preview && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="relative"
                    style={{
                      height: "400px",
                      backgroundColor: "#f9fafb",
                      padding: "20px",
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: `
                          <div id="cookie-banner-preview" style="
                            position: absolute;
                            ${bannerConfig.position === "top" ? "top: 0;" : "bottom: 0;"}
                            left: 0;
                            right: 0;
                            background: ${selectedTemplate.style.backgroundColor};
                            color: ${selectedTemplate.style.textColor};
                            padding: ${selectedTemplate.style.padding};
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            flex-wrap: wrap;
                            gap: 15px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-size: ${selectedTemplate.style.fontSize};
                            border-radius: ${selectedTemplate.style.borderRadius};
                            ${selectedTemplate.style.border || ""}
                            ${selectedTemplate.style.boxShadow || ""}
                          ">
                            <div style="flex: 1; min-width: 250px;">
                              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
                                ${bannerConfig.title || "🍪 We use cookies"}
                              </h3>
                              <p style="margin: 0; opacity: 0.9; line-height: 1.5;">
                                ${bannerConfig.message || "This site uses tracking cookies. Accept to enable analytics."}
                              </p>
                            </div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                              <button style="
                                background: ${selectedTemplate.style.buttonColor};
                                color: ${selectedTemplate.style.buttonTextColor};
                                border: none;
                                padding: 12px 24px;
                                border-radius: 6px;
                                font-weight: 600;
                                cursor: pointer;
                                font-size: ${selectedTemplate.style.fontSize};
                              ">
                                ${bannerConfig.acceptButtonText || "Accept"}
                              </button>
                              ${bannerConfig.showRejectButton !== false ? `
                              <button style="
                                background: transparent;
                                color: ${selectedTemplate.style.textColor};
                                border: 2px solid ${selectedTemplate.style.textColor};
                                padding: 12px 24px;
                                border-radius: 6px;
                                font-weight: 600;
                                cursor: pointer;
                                font-size: ${selectedTemplate.style.fontSize};
                              ">
                                ${bannerConfig.rejectButtonText || "Reject"}
                              </button>
                              ` : ""}
                            </div>
                          </div>
                        `,
                      }}
                    />
                  </div>
                </div>
              )}

              {!preview && (
                <div className="text-center py-12 text-gray-500">
                  Click "Show Preview" to see how your banner will look
                </div>
              )}
            </div>
          </div>
        )}

        {sites.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              No sites added yet. Add your first domain to customize banners.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Add Domain
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
