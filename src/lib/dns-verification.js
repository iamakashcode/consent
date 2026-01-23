import dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);

// Use promises API for better error handling
// Don't override DNS servers in serverless - use system defaults
// dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); // Use reliable DNS servers

/**
 * Verify domain ownership by checking DNS TXT record
 * @param {string} domain - The domain to verify
 * @param {string} verificationToken - The token to check for
 * @returns {Promise<{verified: boolean, error?: string, debug?: any}>}
 */
export async function verifyDomainDNS(domain, verificationToken) {
  const debug = {
    domain,
    verificationToken,
    recordsChecked: [],
    errors: [],
  };

  try {
    // Clean domain (remove www, protocol, etc.)
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "");
    cleanDomain = cleanDomain.replace(/^www\./, "");
    cleanDomain = cleanDomain.split("/")[0];
    cleanDomain = cleanDomain.split("?")[0];

    if (!cleanDomain) {
      return { verified: false, error: "Invalid domain", debug };
    }

    // Try to resolve TXT records for the domain
    // We'll check both the root domain and _consent-verification subdomain
    const recordsToCheck = [
      `_consent-verification.${cleanDomain}`, // Subdomain approach (more specific)
      cleanDomain, // Root domain approach
    ];

    for (const recordDomain of recordsToCheck) {
      try {
        console.log(`[DNS Verification] Checking TXT records for: ${recordDomain}`);
        debug.recordsChecked.push(recordDomain);

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("DNS lookup timeout")), 10000); // 10 second timeout
        });

        const txtRecords = await Promise.race([
          resolveTxt(recordDomain),
          timeoutPromise,
        ]);
        
        console.log(`[DNS Verification] Found ${txtRecords.length} TXT record(s) for ${recordDomain}`);
        
        // Flatten the array (DNS returns arrays of arrays)
        const allRecords = txtRecords.flat();
        console.log(`[DNS Verification] All TXT records:`, JSON.stringify(allRecords));
        
        // Check if any TXT record contains our verification token
        for (const record of allRecords) {
          // Handle both string and array formats
          const recordString = Array.isArray(record) ? record.join("") : String(record);
          
          // Remove quotes if present
          const cleanRecord = recordString.replace(/^["']|["']$/g, "").trim();
          
          console.log(`[DNS Verification] Checking record: "${cleanRecord}" against token: "${verificationToken}"`);
          
          // Check for exact match or if token is in the record
          if (cleanRecord === verificationToken || cleanRecord.includes(verificationToken)) {
            console.log(`[DNS Verification] ✓ Match found! Domain verified.`);
            return { verified: true, debug };
          }
        }
      } catch (dnsError) {
        const errorMsg = dnsError.message || String(dnsError);
        const errorCode = dnsError.code || "UNKNOWN";
        
        console.log(`[DNS Verification] Error for ${recordDomain}:`, errorCode, errorMsg);
        debug.errors.push({ domain: recordDomain, code: errorCode, message: errorMsg });
        
        // If this domain doesn't have TXT records, try the next one
        if (dnsError.code === "ENOTFOUND" || dnsError.code === "ENODATA" || dnsError.code === "NXDOMAIN") {
          continue;
        }
        // For timeout errors, log but continue
        if (errorMsg.includes("timeout")) {
          console.warn(`[DNS Verification] Timeout for ${recordDomain}, trying next...`);
          continue;
        }
        // For other DNS errors, log but continue
        console.warn(`[DNS Verification] DNS lookup error for ${recordDomain}:`, errorMsg);
      }
    }

    const errorMessage = `Verification TXT record not found. Please ensure:
1. The DNS TXT record is added correctly
2. The record name is exactly: _consent-verification.${cleanDomain}
3. The record value is exactly: ${verificationToken}
4. Wait 5-10 minutes for DNS propagation
5. Check your DNS provider's dashboard to confirm the record exists`;

    console.log(`[DNS Verification] ✗ Verification failed. Debug info:`, JSON.stringify(debug, null, 2));

    return {
      verified: false,
      error: errorMessage,
      debug,
    };
  } catch (error) {
    console.error("[DNS Verification] Unexpected error:", error);
    debug.errors.push({ message: error.message, stack: error.stack });
    return {
      verified: false,
      error: `DNS verification failed: ${error.message}`,
      debug,
    };
  }
}

/**
 * Generate DNS TXT record instructions
 * @param {string} domain - The domain
 * @param {string} verificationToken - The verification token
 * @returns {Object} Instructions for adding DNS record
 */
export function getDNSInstructions(domain, verificationToken) {
  let cleanDomain = domain.trim().toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//, "");
  cleanDomain = cleanDomain.replace(/^www\./, "");
  cleanDomain = cleanDomain.split("/")[0];

  return {
    method: "DNS TXT Record",
    recordType: "TXT",
    recordName: `_consent-verification.${cleanDomain}`,
    recordValue: verificationToken,
    ttl: 3600,
    instructions: [
      `1. Log in to your domain registrar or DNS provider (e.g., Cloudflare, GoDaddy, Namecheap)`,
      `2. Navigate to DNS management for ${cleanDomain}`,
      `3. Add a new TXT record with the following details:`,
      `   - Name/Host: _consent-verification`,
      `   - Type: TXT`,
      `   - Value/Content: ${verificationToken}`,
      `   - TTL: 3600 (or default)`,
      `4. Save the record`,
      `5. Wait 5-10 minutes for DNS propagation`,
      `6. Click "Verify Domain" again`,
    ],
    alternativeInstructions: [
      `Alternatively, you can add the TXT record to the root domain:`,
      `   - Name/Host: @ (or leave blank for root)`,
      `   - Type: TXT`,
      `   - Value/Content: ${verificationToken}`,
    ],
  };
}
