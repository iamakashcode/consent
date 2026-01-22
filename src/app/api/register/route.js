export async function POST(req) {
  const { domain } = await req.json();

  if (!domain) {
    return Response.json({ error: "Domain required" }, { status: 400 });
  }

  const cleanDomain = domain.replace(/^www\./, "");
  const encoded = Buffer.from(cleanDomain).toString("base64");

  return Response.json({
    script: `${process.env.NEXT_PUBLIC_BASE_URL}/client_data/${encoded}/script.js`
  });
}
