import { prisma } from "./prisma";

/**
 * Check if a column exists in a table
 */
export async function columnExists(tableName, columnName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName}
      LIMIT 1
    `;
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error("Error checking column existence:", error);
    return false;
  }
}

/**
 * Check if verification columns exist in sites table
 */
export async function hasVerificationColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sites' 
      AND column_name IN ('isVerified', 'verificationToken', 'verifiedAt')
    `;
    const existingColumns = result.map((r) => r.column_name);
    return {
      hasIsVerified: existingColumns.includes("isVerified"),
      hasVerificationToken: existingColumns.includes("verificationToken"),
      hasVerifiedAt: existingColumns.includes("verifiedAt"),
      allExist: existingColumns.length === 3,
    };
  } catch (error) {
    console.error("Error checking verification columns:", error);
    return {
      hasIsVerified: false,
      hasVerificationToken: false,
      hasVerifiedAt: false,
      allExist: false,
    };
  }
}

/**
 * Check if bannerConfig column exists in sites table
 */
export async function hasBannerConfigColumn() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sites'
      AND column_name = 'bannerConfig'
      LIMIT 1
    `;
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error("Error checking bannerConfig column:", error);
    return false;
  }
}
