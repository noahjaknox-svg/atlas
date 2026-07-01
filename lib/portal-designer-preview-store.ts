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

const GLOBAL_STORE_KEY = Symbol.for("atlas.designerPreviewStore");

function previewStore(): Map<string, StoredPreview> {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_STORE_KEY]?: Map<string, StoredPreview>;
  };
  if (!g[GLOBAL_STORE_KEY]) {
    g[GLOBAL_STORE_KEY] = new Map();
  }
  return g[GLOBAL_STORE_KEY];
}

function purgeExpired() {
  const now = Date.now();
  const previews = previewStore();
  previews.forEach((entry, id) => {
    if (entry.expiresAt <= now) previews.delete(id);
  });
}

export function storeDesignerPreview(
  proposalId: string,
  payload: DesignerPreviewPayload,
  expiresAtMs: number
): string {
  purgeExpired();
  const id = crypto.randomUUID();
  const previews = previewStore();
  previews.set(id, { proposalId, payload, expiresAt: expiresAtMs });
  return id;
}

export function loadDesignerPreview(
  id: string
): { proposalId: string; payload: DesignerPreviewPayload } | null {
  purgeExpired();
  const previews = previewStore();
  const entry = previews.get(id);
  if (!entry || entry.expiresAt <= Date.now()) {
    previews.delete(id);
    return null;
  }
  return { proposalId: entry.proposalId, payload: entry.payload };
}

/** @internal Test helper */
export function clearDesignerPreviewStore() {
  previewStore().clear();
}

export { PREVIEW_TTL_MS };
