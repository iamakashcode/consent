export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return Response.json({ error: "Domain is required" }, { status: 400 });
    }

    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return Response.json(
        { error: `Failed to load domain preview (status ${response.status})` },
        { status: 400 }
      );
    }

    let html = await response.text();
    // Strip third-party scripts to prevent runtime errors in preview iframe
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    // Remove modulepreload/preload scripts to avoid broken imports
    html = html.replace(/<link[^>]+rel=["']modulepreload["'][^>]*>/gi, "");
    html = html.replace(/<link[^>]+rel=["']preload["'][^>]*as=["']script["'][^>]*>/gi, "");
    return Response.json({ html });
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "Preview request timed out"
      : "Failed to load preview";
    return Response.json({ error: message }, { status: 500 });
  }
}
