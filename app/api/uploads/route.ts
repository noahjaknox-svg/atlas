import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);

const BUCKET = "proposal-media";

function sanitizeFolder(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

export async function POST(request: Request) {
  try {
    await requireInternalUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return jsonError("No file provided", 400);
    }
    if (!ALLOWED.has(file.type)) {
      return jsonError("Unsupported file type", 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonError("File too large (max 12MB)", 400);
    }

    const ext = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".jpg");
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const folderRaw = form.get("proposalId");
    const folder = typeof folderRaw === "string" && folderRaw ? sanitizeFolder(folderRaw) : "";
    const buffer = Buffer.from(await file.arrayBuffer());

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const objectPath = folder ? `${folder}/${safeName}` : safeName;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, buffer, { contentType: file.type, upsert: false });
      if (error) {
        return jsonError(`Storage upload failed: ${error.message}`, 500);
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
      return jsonOk({ url: data.publicUrl });
    }

    // Fallback: local disk (development / always-on server)
    const dir = folder
      ? path.join(process.cwd(), "public", "uploads", folder)
      : path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), buffer);
    const publicPath = folder ? `/uploads/${folder}/${safeName}` : `/uploads/${safeName}`;
    return jsonOk({ url: publicPath });
  } catch (e) {
    return handleApiError(e);
  }
}
