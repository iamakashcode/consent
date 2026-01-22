import { sites } from "@/lib/store";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const siteKey = searchParams.get("siteKey");
  const domain = searchParams.get("domain");

  const site = sites.get(siteKey);

  if (!site) {
    return Response.json({ valid: false });
  }

  if (!domain.endsWith(site.domain)) {
    return Response.json({ valid: false });
  }

  return Response.json({
    valid: true,
    categories: ["analytics"],
  });
}
