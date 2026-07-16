import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

const MAX_BYTES = 25 * 1024 * 1024;
const BUCKET = "proposal-media";
const DEFAULT_CATEGORY = "afm_poh";

function isPdf(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function parseEffectiveDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function storePdf(
  typeId: string,
  file: File,
  buffer: Buffer
): Promise<{ url: string; objectPath: string }> {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const folder = `crew-afm/${sanitizeSegment(typeId)}`;
  const objectPath = `${folder}/${safeName}`;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && supabaseUrl) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, { contentType: "application/pdf", upsert: false });
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    return { url: data.publicUrl, objectPath };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "crew-afm", sanitizeSegment(typeId));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buffer);
  return { url: `/uploads/crew-afm/${sanitizeSegment(typeId)}/${safeName}`, objectPath };
}

function pdfMeta(row: {
  afmPdfUrl: string | null;
  afmPdfFileName: string | null;
  afmPdfCategory: string | null;
  afmPdfRevision: string | null;
  afmPdfEffectiveDate: Date | null;
  afmPdfUploadedAt: Date | null;
}) {
  return {
    afmPdfUrl: row.afmPdfUrl,
    afmPdfFileName: row.afmPdfFileName,
    afmPdfCategory: row.afmPdfCategory,
    afmPdfRevision: row.afmPdfRevision,
    afmPdfEffectiveDate: row.afmPdfEffectiveDate
      ? row.afmPdfEffectiveDate.toISOString().slice(0, 10)
      : null,
    afmPdfUploadedAt: row.afmPdfUploadedAt?.toISOString() ?? null,
  };
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const form = await request.formData();
    const aircraftTypeId = String(form.get("aircraftTypeId") ?? "").trim();
    if (!aircraftTypeId) {
      return jsonError("aircraftTypeId is required", 400);
    }

    const existing = await prisma.aircraftType.findUnique({
      where: { id: aircraftTypeId },
      select: { id: true },
    });
    if (!existing) {
      return jsonError("Aircraft type not found", 404);
    }

    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return jsonError("No PDF file provided", 400);
    }
    if (!isPdf(file)) {
      return jsonError("File must be a PDF", 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonError("File too large (max 25MB)", 400);
    }

    const revision =
      typeof form.get("revision") === "string" ? String(form.get("revision")).trim() : "";
    const categoryRaw =
      typeof form.get("category") === "string" ? String(form.get("category")).trim() : "";
    const category = categoryRaw || DEFAULT_CATEGORY;
    const effectiveDate = parseEffectiveDate(form.get("effectiveDate"));
    if (form.get("effectiveDate") && !effectiveDate) {
      return jsonError("Invalid effectiveDate", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storePdf(aircraftTypeId, file, buffer);

    const row = await prisma.aircraftType.update({
      where: { id: aircraftTypeId },
      data: {
        afmPdfUrl: url,
        afmPdfFileName: file.name || "afm.pdf",
        afmPdfCategory: category,
        afmPdfRevision: revision || null,
        afmPdfEffectiveDate: effectiveDate,
        afmPdfUploadedAt: new Date(),
      },
    });

    return jsonOk(pdfMeta(row));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = (await request.json().catch(() => ({}))) as { aircraftTypeId?: string };
    const aircraftTypeId = String(body.aircraftTypeId ?? "").trim();
    if (!aircraftTypeId) {
      return jsonError("aircraftTypeId is required", 400);
    }

    const existing = await prisma.aircraftType.findUnique({
      where: { id: aircraftTypeId },
      select: {
        id: true,
        afmPdfUrl: true,
      },
    });
    if (!existing) {
      return jsonError("Aircraft type not found", 404);
    }

    // Best-effort local file delete when using disk fallback
    if (existing.afmPdfUrl?.startsWith("/uploads/crew-afm/")) {
      const rel = existing.afmPdfUrl.replace(/^\//, "");
      const full = path.join(process.cwd(), "public", rel);
      try {
        await unlink(full);
      } catch {
        // ignore missing file
      }
    }

    const row = await prisma.aircraftType.update({
      where: { id: aircraftTypeId },
      data: {
        afmPdfUrl: null,
        afmPdfFileName: null,
        afmPdfCategory: DEFAULT_CATEGORY,
        afmPdfRevision: null,
        afmPdfEffectiveDate: null,
        afmPdfUploadedAt: null,
      },
    });

    return jsonOk(pdfMeta(row));
  } catch (e) {
    return handleApiError(e);
  }
}
