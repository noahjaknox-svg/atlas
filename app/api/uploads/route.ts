import { writeFile, mkdir } from "fs/promises";
import path from "path";
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
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, safeName), buffer);

    return jsonOk({ url: `/uploads/${safeName}` });
  } catch (e) {
    return handleApiError(e);
  }
}
