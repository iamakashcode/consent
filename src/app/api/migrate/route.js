/**
 * TEMPORARY MIGRATION ROUTE
 * 
 * ⚠️ WARNING: This route should be DELETED after running migrations!
 * It's a temporary helper to run migrations on Vercel.
 * 
 * Usage:
 * 1. Deploy this route
 * 2. Visit: https://your-app.vercel.app/api/migrate
 * 3. Check the response
 * 4. DELETE this file immediately after use
 */

import { prisma } from "@/lib/prisma";

export async function GET(req) {
  // Basic security check - you can add more if needed
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.MIGRATION_TOKEN || "temporary-migration-token-change-me";
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return Response.json(
      { error: "Unauthorized. Set MIGRATION_TOKEN env var and use: Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  try {
    // Check current schema
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sites' 
      AND column_name IN ('isVerified', 'verificationToken', 'verifiedAt')
    `;

    const existingColumns = result.map((r) => r.column_name);
    const missingColumns = ['isVerified', 'verificationToken', 'verifiedAt'].filter(
      col => !existingColumns.includes(col)
    );

    if (missingColumns.length === 0) {
      return Response.json({
        success: true,
        message: "All columns already exist",
        existingColumns,
      });
    }

    // Run migration SQL
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='sites' AND column_name='isVerified') THEN
              ALTER TABLE "sites" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='sites' AND column_name='verificationToken') THEN
              ALTER TABLE "sites" ADD COLUMN "verificationToken" TEXT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='sites' AND column_name='verifiedAt') THEN
              ALTER TABLE "sites" ADD COLUMN "verifiedAt" TIMESTAMP(3);
          END IF;
      END $$;
    `);

    // Generate tokens for existing sites
    await prisma.$executeRawUnsafe(`
      UPDATE "sites" 
      SET "verificationToken" = 'cm_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 13) 
      WHERE "verificationToken" IS NULL;
    `);

    return Response.json({
      success: true,
      message: "Migration completed successfully",
      addedColumns: missingColumns,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
