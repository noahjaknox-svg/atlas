import {
  loadDesignerPreview,
  PREVIEW_TTL_MS,
  storeDesignerPreview,
  type DesignerPreviewPayload,
} from "./portal-designer-preview-store";

export type { DesignerPreviewPayload };

/** Store unsaved designer state server-side; return a short preview id for the URL. */
export async function createDesignerPreviewToken(
  proposalId: string,
  payload: DesignerPreviewPayload
): Promise<{ token: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const token = storeDesignerPreview(proposalId, payload, expiresAt.getTime());
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function verifyDesignerPreviewToken(
  token: string
): Promise<{ proposalId: string; payload: DesignerPreviewPayload } | null> {
  return loadDesignerPreview(token);
}
