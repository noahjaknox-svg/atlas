import { readdir, stat } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PROPOSAL_IMAGE_FILES, proposalImage } from "./proposal-images";

export const MEDIA_BUCKET = "proposal-media";

export type MediaLibraryItem = {
  url: string;
  label: string;
  source: "stock" | "upload";
  kind: "image" | "video";
  /** Sort key — higher = newer */
  sortKey: number;
};

const VIDEO_EXT = /\.(mp4|webm)(\?|$)/i;

export function isImageMediaUrl(url: string): boolean {
  return !VIDEO_EXT.test(url);
}

export function mediaKindFromUrl(url: string): "image" | "video" {
  return VIDEO_EXT.test(url) ? "video" : "image";
}

function humanizeStockLabel(key: string, file: string): string {
  const fromKey = key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  if (fromKey) return fromKey;
  return file.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
}

function uploadSortKeyFromName(name: string): number {
  const match = /^(\d{10,})-/.exec(name);
  return match ? Number(match[1]) : 0;
}

export function getStockMediaItems(): MediaLibraryItem[] {
  return Object.entries(PROPOSAL_IMAGE_FILES).map(([key, file]) => {
    const url = proposalImage(file);
    return {
      url,
      label: humanizeStockLabel(key, file),
      source: "stock" as const,
      kind: mediaKindFromUrl(url),
      sortKey: 0,
    };
  });
}

type ListedUpload = { url: string; label: string; sortKey: number };

async function listSupabasePrefix(
  supabase: SupabaseClient,
  prefix: string
): Promise<ListedUpload[]> {
  const results: ListedUpload[] = [];
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(prefix, {
    limit: 200,
    sortBy: { column: "name", order: "desc" },
  });
  if (error || !data) return results;

  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata == null) {
      const nested = await listSupabasePrefix(supabase, itemPath);
      results.push(...nested);
      continue;
    }
    const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(itemPath);
    results.push({
      url: publicData.publicUrl,
      label: item.name,
      sortKey: uploadSortKeyFromName(item.name),
    });
  }
  return results;
}

async function listLocalUploadDir(dir: string, urlPrefix: string): Promise<ListedUpload[]> {
  const results: ListedUpload[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const publicPath = `${urlPrefix}/${entry.name}`;
      if (entry.isDirectory()) {
        const nested = await listLocalUploadDir(fullPath, publicPath);
        results.push(...nested);
        continue;
      }
      if (!entry.isFile()) continue;
      const fileStat = await stat(fullPath);
      results.push({
        url: publicPath,
        label: entry.name,
        sortKey: uploadSortKeyFromName(entry.name) || fileStat.mtimeMs,
      });
    }
  } catch {
    return results;
  }

  return results;
}

export async function listUploadedMedia(): Promise<MediaLibraryItem[]> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let uploads: ListedUpload[] = [];

  if (serviceKey && supabaseUrl) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    uploads = await listSupabasePrefix(supabase, "");
  } else {
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    uploads = await listLocalUploadDir(uploadsRoot, "/uploads");
  }

  const seen = new Set<string>();
  const items: MediaLibraryItem[] = [];
  for (const upload of uploads) {
    if (seen.has(upload.url)) continue;
    seen.add(upload.url);
    items.push({
      url: upload.url,
      label: upload.label,
      source: "upload",
      kind: mediaKindFromUrl(upload.url),
      sortKey: upload.sortKey,
    });
  }

  items.sort((a, b) => b.sortKey - a.sortKey);
  return items;
}

export async function getMediaLibraryItems(options?: {
  imagesOnly?: boolean;
}): Promise<MediaLibraryItem[]> {
  const stock = getStockMediaItems();
  const uploads = await listUploadedMedia();
  const stockUrls = new Set(stock.map((item) => item.url));
  const merged = [...stock, ...uploads.filter((item) => !stockUrls.has(item.url))];

  if (options?.imagesOnly) {
    return merged.filter((item) => item.kind === "image");
  }
  return merged;
}
