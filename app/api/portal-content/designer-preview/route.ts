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

/** Issue a short-lived preview token for master template designer state. */
export async function POST(request: Request) {
  try {
    await requireInternalUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid payload");
    }

    const result = await createDesignerPreviewToken("master", {
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
