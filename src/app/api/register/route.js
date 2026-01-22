import { SITE_MAP } from "@/lib/site-map";

export async function POST(req) {
  const { domain } = await req.json();

  if (!domain) {
    return Response.json({ error: "Domain required" }, { status: 400 });
  }

  const siteId = crypto.randomUUID().replace(/-/g, "");

  SITE_MAP[siteId] = domain.replace(/^www\./, "");

  return Response.json({
    siteId,
    script: `${process.env.NEXT_PUBLIC_BASE_URL}/client_data/${siteId}/script.js`
  });
}
