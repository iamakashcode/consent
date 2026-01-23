-- AlterTable
-- Add columns as nullable first
ALTER TABLE "sites" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationToken" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- Generate verification tokens for existing sites
UPDATE "sites" SET "verificationToken" = 'cm_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 13) WHERE "verificationToken" IS NULL;
