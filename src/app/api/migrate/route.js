/**
 * MIGRATION ROUTE - Apply pending migrations via API
 * 
 * This route applies all pending migrations by running the SQL directly.
 * Use this after deploying to Vercel when migrations weren't run during build.
 * 
 * Usage:
 * curl -X POST https://your-app.vercel.app/api/migrate \
 *   -H "Authorization: Bearer YOUR_MIGRATION_TOKEN"
 * 
 * Set MIGRATION_TOKEN in Vercel environment variables for security.
 */

import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(req) {
  // Security check
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.MIGRATION_TOKEN;
  
  if (!expectedToken) {
    return Response.json(
      { error: "MIGRATION_TOKEN not configured. Set it in Vercel environment variables." },
      { status: 500 }
    );
  }
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return Response.json(
      { error: "Unauthorized. Use: Authorization: Bearer <MIGRATION_TOKEN>" },
      { status: 401 }
    );
  }

  try {
    const results = [];
    
    // Apply pending migrations by running their SQL
    // Check which migrations need to be applied
    // Note: Old Razorpay migration removed - using Paddle now
    const migrationDirs = [
      "20260124130000_add_last_seen_at",
      "20260124140000_add_trial_support",
      // "20260124150000_add_razorpay_subscription_fields", // Removed - using Paddle now
    ];

    for (const migrationDir of migrationDirs) {
      try {
        const migrationPath = join(process.cwd(), "prisma", "migrations", migrationDir, "migration.sql");
        const migrationSQL = readFileSync(migrationPath, "utf-8");
        
        // Execute migration SQL
        await prisma.$executeRawUnsafe(migrationSQL);
        results.push({ migration: migrationDir, status: "applied" });
      } catch (error) {
        // Migration might already be applied or file doesn't exist
        if (error.code === "ENOENT") {
          results.push({ migration: migrationDir, status: "skipped", reason: "File not found" });
        } else if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
          results.push({ migration: migrationDir, status: "already_applied" });
        } else {
          results.push({ migration: migrationDir, status: "error", error: error.message });
        }
      }
    }
    
    return Response.json({
      success: true,
      message: "Migrations processed",
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  return Response.json({
    message: "Migration endpoint",
    usage: "POST to this endpoint with Authorization: Bearer <MIGRATION_TOKEN>",
    note: "Set MIGRATION_TOKEN in Vercel environment variables",
  });
}
