import type { ExperienceSectionSnapshot } from "./experience-content";
import type { PortalDesignerHeroState } from "@/components/internal/portal-designer/portal-designer-types";

export type DesignerPreviewPayload = {
  sections: ExperienceSectionSnapshot[];
  hero?: PortalDesignerHeroState;
  activePageSlug: string;
  renderSchemaVersion?: number;
};

type StoredPreview = {
  proposalId: string;
  payload: DesignerPreviewPayload;
  expiresAt: number;
};

const PREVIEW_TTL_MS = 15 * 60 * 1000;

/**
 * Where unsaved designer previews live between "Preview" (POST) and the preview page (GET).
 *
 * Must be shared storage: on Vercel those two requests usually hit different serverless
 * instances, so an in-process map loses the preview and the page bounces back to the
 * designer. Default is the database; tests swap in memory.
 */
export type DesignerPreviewBackend = {
  put(id: string, entry: StoredPreview): Promise<void>;
  get(id: string): Promise<StoredPreview | null>;
  delete(id: string): Promise<void>;
  purgeExpired(nowMs: number): Promise<void>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const databaseBackend: DesignerPreviewBackend = {
  async put(id, entry) {
    const { prisma } = await import("./db");
    await prisma.designerPreview.create({
      data: {
        id,
        scope: entry.proposalId,
        payload: entry.payload as unknown as object,
        expiresAt: new Date(entry.expiresAt),
      },
    });
  },
  async get(id) {
    if (!UUID_RE.test(id)) return null; // not ours; avoids a DB type error on junk ids
    const { prisma } = await import("./db");
    const row = await prisma.designerPreview.findUnique({ where: { id } });
    if (!row) return null;
    return {
      proposalId: row.scope,
      payload: row.payload as unknown as DesignerPreviewPayload,
      expiresAt: row.expiresAt.getTime(),
    };
  },
  async delete(id) {
    if (!UUID_RE.test(id)) return;
    const { prisma } = await import("./db");
    await prisma.designerPreview.deleteMany({ where: { id } });
  },
  async purgeExpired(nowMs) {
    const { prisma } = await import("./db");
    await prisma.designerPreview.deleteMany({ where: { expiresAt: { lte: new Date(nowMs) } } });
  },
};

export function createMemoryPreviewBackend(): DesignerPreviewBackend & { clear(): void } {
  const map = new Map<string, StoredPreview>();
  return {
    async put(id, entry) {
      map.set(id, entry);
    },
    async get(id) {
      return map.get(id) ?? null;
    },
    async delete(id) {
      map.delete(id);
    },
    async purgeExpired(nowMs) {
      map.forEach((entry, id) => {
        if (entry.expiresAt <= nowMs) map.delete(id);
      });
    },
    clear() {
      map.clear();
    },
  };
}

let backend: DesignerPreviewBackend = databaseBackend;

/** @internal Tests only. Pass nothing to restore the database backend. */
export function setDesignerPreviewBackend(next?: DesignerPreviewBackend) {
  backend = next ?? databaseBackend;
}

export async function storeDesignerPreview(
  proposalId: string,
  payload: DesignerPreviewPayload,
  expiresAtMs: number
): Promise<string> {
  // Lazy cleanup; a failure here must never block opening a preview.
  await backend.purgeExpired(Date.now()).catch(() => {});
  const id = crypto.randomUUID();
  await backend.put(id, { proposalId, payload, expiresAt: expiresAtMs });
  return id;
}

export async function loadDesignerPreview(
  id: string
): Promise<{ proposalId: string; payload: DesignerPreviewPayload } | null> {
  const entry = await backend.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    await backend.delete(id).catch(() => {});
    return null;
  }
  return { proposalId: entry.proposalId, payload: entry.payload };
}

export { PREVIEW_TTL_MS };
