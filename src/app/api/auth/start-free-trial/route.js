import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateSiteId } from "@/lib/store";
import { startUserTrial } from "@/lib/subscription";

/**
 * POST /api/auth/start-free-trial
 * Create Site + Subscription (trial) for the given domain and start 14-day user trial.
 * Domain can be from body or from user's signup websiteUrl.
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    let domain = body.domain?.trim() || null;

    if (!domain) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { websiteUrl: true },
      });
      domain = user?.websiteUrl?.trim() || null;
    }

    if (!domain) {
      return Response.json(
        { error: "Domain is required. Add a domain in the field below or complete signup with a domain." },
        { status: 400 }
      );
    }

    let cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split("?")[0];
    if (!cleanDomain) {
      return Response.json({ error: "Invalid domain" }, { status: 400 });
    }

    const domainRegex = /^[a-z0-9]+([\-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return Response.json(
        { error: "Invalid domain format (e.g. example.com)" },
        { status: 400 }
      );
    }

    const existingSite = await prisma.site.findFirst({
      where: { userId, domain: cleanDomain },
      include: { subscription: true },
    });

    if (existingSite) {
      const trial = await startUserTrial(userId);
      if (!existingSite.subscription) {
        await prisma.subscription.create({
          data: {
            siteId: existingSite.id,
            plan: "basic",
            billingInterval: "monthly",
            status: "trial",
            currentPeriodStart: trial.trialStartedAt,
            currentPeriodEnd: trial.trialEndAt,
          },
        });
      }
      return Response.json({
        success: true,
        siteId: existingSite.siteId,
        message: "Free trial started.",
      });
    }

    const siteId = generateSiteId();
    const verificationToken = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const site = await prisma.site.create({
      data: {
        domain: cleanDomain,
        siteId,
        userId,
        trackers: [],
        verificationToken,
        isVerified: false,
      },
    });

    const trial = await startUserTrial(userId);

    await prisma.subscription.create({
      data: {
        siteId: site.id,
        plan: "basic",
        billingInterval: "monthly",
        status: "trial",
        currentPeriodStart: trial.trialStartedAt,
        currentPeriodEnd: trial.trialEndAt,
      },
    });

    return Response.json({
      success: true,
      siteId: site.siteId,
      message: "14-day free trial started. You can use your consent banner now.",
    });
  } catch (error) {
    console.error("[Start-free-trial]", error);
    return Response.json(
      { error: error.message || "Failed to start free trial" },
      { status: 500 }
    );
  }
}
