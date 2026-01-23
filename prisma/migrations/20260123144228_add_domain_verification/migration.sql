-- AlterTable
-- Add columns only if they don't exist (using DO block for conditional logic)
DO $$
BEGIN
    -- Add isVerified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sites' AND column_name='isVerified') THEN
        ALTER TABLE "sites" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add verificationToken column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sites' AND column_name='verificationToken') THEN
        ALTER TABLE "sites" ADD COLUMN "verificationToken" TEXT;
    END IF;

    -- Add verifiedAt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sites' AND column_name='verifiedAt') THEN
        ALTER TABLE "sites" ADD COLUMN "verifiedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Generate verification tokens for existing sites that don't have one
UPDATE "sites" 
SET "verificationToken" = 'cm_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 13) 
WHERE "verificationToken" IS NULL;
