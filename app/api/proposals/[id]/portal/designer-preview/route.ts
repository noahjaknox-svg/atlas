import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { createDesignerPreviewToken } from "@/lib/portal-designer-preview-token";
import { z } from "zod";

const bodySchema = z.object({
  sections: z.array(z.record(z.unknown())),
  hero: z
    .object({
      clientSummary: z.string(),
      portalImageUrl: z.string(),
      portalVideoUrl: z.string(),
      portalSpecHighlights: z.array(z.string()),
    })
    .optional(),
  activePageSlug: z.string(),
});

/** Issue a 15-minute preview token for unsaved designer state. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid payload");
    }

    const result = await createDesignerPreviewToken(proposalId, {
      sections: parsed.data.sections as never,
      hero: parsed.data.hero,
      activePageSlug: parsed.data.activePageSlug,
      renderSchemaVersion: 3,
    });

    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
