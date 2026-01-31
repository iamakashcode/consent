import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname, searchParams } = req.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/signup", "/api/auth", "/api/script", "/api/webhooks"];
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path + "/")
  );

  // API routes that should be publicly accessible
  const publicApiPaths = [
    "/api/auth",
    "/api/script",
    "/api/webhooks",
    "/api/sites/*/verify-callback",
    "/api/sites/*/track",
    "/api/sites/*/consent-log",
  ];
  const isPublicApi = publicApiPaths.some(path => {
    if (path.includes("*")) {
      const regex = new RegExp("^" + path.replace(/\*/g, "[^/]+") + "$");
      return regex.test(pathname);
    }
    return pathname.startsWith(path);
  });

  // Allow public paths
  if (isPublicPath || isPublicApi) {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedPaths = ["/dashboard", "/profile", "/banner", "/admin", "/payment"];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  // Plans page - allow viewing but handle plan selection
  if (pathname === "/plans") {
    // If user is selecting a plan (has plan param) but not logged in
    const planParam = searchParams.get("plan");
    const siteIdParam = searchParams.get("siteId");

    if (!token && (planParam || siteIdParam)) {
      // Redirect to login with callback to return to plans page
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname + "?" + searchParams.toString());
      return NextResponse.redirect(url);
    }

    // Allow viewing plans page
    return NextResponse.next();
  }

  // Protect authenticated routes
  if (isProtectedPath && !token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + (searchParams.toString() ? "?" + searchParams.toString() : ""));
    return NextResponse.redirect(url);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    if (!token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Protected API routes
  const protectedApiPaths = ["/api/sites", "/api/crawl", "/api/payment", "/api/subscription", "/api/admin"];
  const isProtectedApi = protectedApiPaths.some(path => pathname.startsWith(path));

  if (isProtectedApi && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin API routes
  if (pathname.startsWith("/api/admin") && !token?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
