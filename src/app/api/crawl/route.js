import { detectTrackers } from "@/lib/tracker-detector";
import { registerSite } from "@/lib/store";

export async function POST(req) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return Response.json({ error: "Domain is required" }, { status: 400 });
    }

    // Clean domain
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "");
    cleanDomain = cleanDomain.replace(/^www\./, "");
    cleanDomain = cleanDomain.split("/")[0];
    cleanDomain = cleanDomain.split("?")[0];

    if (!cleanDomain) {
      return Response.json({ error: "Invalid domain" }, { status: 400 });
    }

    // Fetch the website
    let html;
    try {
      const url = `https://${cleanDomain}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      html = await response.text();
    } catch (error) {
      return Response.json(
        {
          error: `Failed to fetch website: ${error.message}. Make sure the domain is accessible.`,
        },
        { status: 500 }
      );
    }

    // Detect trackers
    const trackers = detectTrackers(html, cleanDomain);

    // Register site and generate script URL
    const siteId = registerSite(cleanDomain, trackers);
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    
    // Only include domain in URL - trackers will be extracted from detected domains
    // This keeps the URL shorter and simpler
    const scriptUrl = `${baseUrl}/api/script/${siteId}?domain=${encodeURIComponent(cleanDomain)}`;

    return Response.json({
      domain: cleanDomain,
      trackers,
      scriptUrl,
      siteId,
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

