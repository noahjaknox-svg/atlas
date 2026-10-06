import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  getPortalContent,
  getFleetShowcase,
  upsertPortalContent,
  replaceFleetShowcase,
  type FleetShowcaseItem,
  getExperienceMasterTemplates,
} from "@/lib/portal-content";
import { sectionNavSlug } from "@/lib/experience-page-slug";
import type { ExperienceMasterTemplate } from "@/lib/experience-master";

/**
 * Page ↔ usage type assignments are owned by Data Warehouse → Usage Types. A designer
 * save must not overwrite them (an open tab may hold a stale copy), so keep the stored
 * values and ignore whatever the client sent.
 */
async function keepStoredUsageTypeIds(
  incoming: unknown[]
): Promise<ExperienceMasterTemplate[]> {
  const stored = new Map(
    (await getExperienceMasterTemplates()).map((t) => [sectionNavSlug(t), t.usageTypeIds ?? []])
  );
  return incoming.map((t) => {
    if (!t || typeof t !== "object" || !("sectionType" in t)) return t;
    const page = t as { sectionType: string; pageSlug?: string | null };
    return { ...page, usageTypeIds: stored.get(sectionNavSlug(page)) ?? [] };
  }) as ExperienceMasterTemplate[];
}

export async function GET() {
  try {
    await requireInternalUser();
    const [content, fleet] = await Promise.all([getPortalContent(), getFleetShowcase()]);
    return jsonOk({ content, fleet });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireInternalUser();
    const body = await request.json();

    if (body.content) {
      // Templates only go through the experienceTemplates path below (usage-type guard).
      const { experienceTemplates: _ignored, ...content } = body.content;
      await upsertPortalContent(content);
    }
    if (Array.isArray(body.experienceTemplates)) {
      await upsertPortalContent({
        experienceTemplates: await keepStoredUsageTypeIds(body.experienceTemplates),
      });
    }
    if (Array.isArray(body.fleet)) {
      await replaceFleetShowcase(body.fleet as FleetShowcaseItem[]);
    }

    const [content, fleet] = await Promise.all([getPortalContent(), getFleetShowcase()]);
    return jsonOk({ content, fleet });
  } catch (e) {
    return handleApiError(e);
  }
}
