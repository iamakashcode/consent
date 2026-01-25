/**
 * Script to verify and fix the subscriptions table schema
 * Run with: node scripts/verify-subscription-schema.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAndFixSchema() {
  try {
    console.log('🔍 Checking subscriptions table schema...\n');

    // Check if siteId column exists
    const columnCheck = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      AND column_name = 'siteId'
    `;

    console.log('📊 siteId column check:', columnCheck);

    if (!columnCheck || columnCheck.length === 0) {
      console.log('❌ siteId column does not exist! Adding it...');
      await prisma.$executeRaw`
        ALTER TABLE "subscriptions" ADD COLUMN "siteId" TEXT;
      `;
      console.log('✅ Added siteId column');
    } else {
      const column = columnCheck[0];
      console.log(`✅ siteId column exists:`, {
        dataType: column.data_type,
        isNullable: column.is_nullable,
        defaultValue: column.column_default,
      });

      // Check if it's nullable
      if (column.is_nullable === 'YES') {
        console.log('⚠️  siteId is nullable, but should be NOT NULL');
        console.log('   Checking for null values...');
        
        const nullCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "subscriptions" WHERE "siteId" IS NULL
        `;
        
        console.log(`   Found ${nullCount[0].count} rows with null siteId`);
        
        if (parseInt(nullCount[0].count) > 0) {
          console.log('   ⚠️  Cannot make NOT NULL while null values exist');
          console.log('   Deleting rows with null siteId...');
          await prisma.$executeRaw`
            DELETE FROM "subscriptions" WHERE "siteId" IS NULL
          `;
          console.log('   ✅ Deleted null rows');
        }
        
        console.log('   Making siteId NOT NULL...');
        await prisma.$executeRaw`
          ALTER TABLE "subscriptions" ALTER COLUMN "siteId" SET NOT NULL
        `;
        console.log('   ✅ Made siteId NOT NULL');
      }
    }

    // Check for unique constraint
    const constraintCheck = await prisma.$queryRaw`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'subscriptions' 
      AND constraint_name = 'subscriptions_siteId_key'
    `;

    if (!constraintCheck || constraintCheck.length === 0) {
      console.log('❌ siteId unique constraint does not exist! Adding it...');
      await prisma.$executeRaw`
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_siteId_key" UNIQUE ("siteId")
      `;
      console.log('✅ Added unique constraint');
    } else {
      console.log('✅ siteId unique constraint exists');
    }

    // Check for foreign key
    const fkCheck = await prisma.$queryRaw`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'subscriptions' 
      AND constraint_name = 'subscriptions_siteId_fkey'
    `;

    if (!fkCheck || fkCheck.length === 0) {
      console.log('❌ siteId foreign key does not exist! Adding it...');
      await prisma.$executeRaw`
        ALTER TABLE "subscriptions" 
        ADD CONSTRAINT "subscriptions_siteId_fkey" 
        FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE
      `;
      console.log('✅ Added foreign key');
    } else {
      console.log('✅ siteId foreign key exists');
    }

    // Check for old userId column
    const userIdColumnCheck = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      AND column_name = 'userId'
    `;

    if (userIdColumnCheck && userIdColumnCheck.length > 0) {
      console.log('⚠️  userId column still exists! This should be removed.');
      console.log('   Checking for foreign key...');
      
      const userIdFkCheck = await prisma.$queryRaw`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'subscriptions' 
        AND constraint_name = 'subscriptions_userId_fkey'
      `;

      if (userIdFkCheck && userIdFkCheck.length > 0) {
        console.log('   Removing userId foreign key...');
        await prisma.$executeRaw`
          ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_userId_fkey"
        `;
        console.log('   ✅ Removed userId foreign key');
      }

      console.log('   Removing userId column...');
      await prisma.$executeRaw`
        ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "userId"
      `;
      console.log('   ✅ Removed userId column');
    } else {
      console.log('✅ userId column does not exist (correct)');
    }

    // Final schema check
    console.log('\n📋 Final subscriptions table schema:');
    const finalSchema = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `;
    
    console.table(finalSchema);

    console.log('\n✅ Schema verification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyAndFixSchema()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
