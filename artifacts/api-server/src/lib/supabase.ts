import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded from any possible location (.env in process.cwd(), or parent folders)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Helper to derive Supabase URL from DATABASE_URL if not explicitly set
function getSupabaseUrl(): string | null {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;

  try {
    // Normalize protocol to http for standard URL parsing
    const normalizedUrl = dbUrl
      .trim()
      .replace(/^postgres:/i, "http:")
      .replace(/^postgresql:/i, "http:");
    
    const parsed = new URL(normalizedUrl);
    
    // Case 1: Check username (e.g. postgres.mtdclbgzgnsustfdzcuj)
    if (parsed.username && parsed.username.includes(".")) {
      const parts = parsed.username.split(".");
      for (const part of parts) {
        if (/^[a-z0-9]{20}$/i.test(part)) {
          return `https://${part.toLowerCase()}.supabase.co`;
        }
      }
    }
    
    // Case 2: Check hostname (e.g. db.mtdclbgzgnsustfdzcuj.supabase.co or db.mtdclbgzgnsustfdzcuj.supabase.com)
    if (parsed.hostname) {
      const parts = parsed.hostname.split(".");
      for (const part of parts) {
        if (/^[a-z0-9]{20}$/i.test(part) && part.toLowerCase() !== "pooler") {
          return `https://${part.toLowerCase()}.supabase.co`;
        }
      }
    }
  } catch (err) {
    // Ignore and fallback to regex parsing
  }

  // Fallback regex parsers
  const directMatch = dbUrl.match(/@db\.([a-z0-9]{20})\.supabase\.(co|com)/i);
  if (directMatch && directMatch[1]) {
    return `https://${directMatch[1].toLowerCase()}.supabase.co`;
  }

  const poolerMatch = dbUrl.match(/:\/\/postgres\.([a-z0-9]{20}):/i);
  if (poolerMatch && poolerMatch[1]) {
    return `https://${poolerMatch[1].toLowerCase()}.supabase.co`;
  }

  return null;
}

const supabaseUrl = getSupabaseUrl();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const supabaseKey = serviceRoleKey || anonKey;

console.log("-----------------------------------------------------------------");
console.log("DIAGNOSTIC - Supabase Storage Initialization:");
console.log("Derived Supabase URL:", supabaseUrl || "NOT DERIVED (DATABASE_URL missing or unrecognized format)");
console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!serviceRoleKey);
console.log("SUPABASE_ANON_KEY present:", !!anonKey);
console.log("SUPABASE_URL env var set:", !!process.env.SUPABASE_URL);
console.log("DATABASE_URL env var set:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const anonymizedDbUrl = process.env.DATABASE_URL.replace(/:[^@]+@/, ":****@");
  console.log("DATABASE_URL format:", anonymizedDbUrl);
}
console.log("-----------------------------------------------------------------");

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  logger.info({ supabaseUrl }, "Supabase Storage client initialized successfully");
} else {
  logger.warn(
    "Supabase credentials not fully configured. Please set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env. Falling back to local/disabled uploads."
  );
}

/**
 * Uploads a buffer directly to Supabase Storage
 * @param buffer - File content buffer
 * @param originalName - Original name of the uploaded file
 * @param mimeType - MIME type of the file
 * @returns Fully qualified public URL of the uploaded image
 */
export async function uploadToSupabase(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  // Create a unique file name under the uploads folder to avoid collisions
  const ext = originalName.split(".").pop() || "png";
  const uniqueName = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const bucketName = process.env.SUPABASE_BUCKET || "shoplux-assets";

  // Proactively check and create the bucket if missing (requires service role key privileges)
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets) {
      const exists = buckets.some((b: any) => b.name === bucketName);
      if (!exists) {
        logger.info({ bucketName }, "Creating missing Supabase Storage bucket...");
        await supabase.storage.createBucket(bucketName, {
          public: true,
        });
      }
    }
  } catch (err) {
    // Ignore and proceed, since the bucket might already exist but listBuckets was unauthorized
    logger.debug({ err }, "Could not check/create Supabase Storage bucket (proceeding anyway)");
  }

  logger.info({ bucketName, uniqueName, mimeType }, "Uploading image to Supabase Storage...");

  // Upload the file buffer
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uniqueName, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    logger.error({ error }, "Supabase storage upload error");
    throw error;
  }

  // Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(uniqueName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("Failed to retrieve public URL from Supabase Storage");
  }

  logger.info({ publicUrl: publicUrlData.publicUrl }, "Supabase Storage upload successful");
  return publicUrlData.publicUrl;
}

/**
 * Automatically converts a relative image string (e.g. '/uploads/filename.png' or '/api/uploads/filename.png')
 * into the fully-qualified Supabase Storage public URL if possible.
 * If the image path is already an absolute URL, it is returned as-is.
 */
export function resolveImageUrl(imgPath: string | null | undefined): string | null {
  if (!imgPath) return null;
  if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
    return imgPath;
  }
  const cleanPath = imgPath.replace(/^\/?(api\/)?uploads\//, "");
  const bucketName = process.env.SUPABASE_BUCKET || "shoplux-assets";
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/uploads/${cleanPath}`;
  }
  return imgPath;
}

