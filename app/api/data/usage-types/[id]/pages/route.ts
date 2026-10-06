import { z } from "zod";
import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getExperienceMasterTemplates, upsertPortalContent } from "@/lib/portal-content";
import { sectionNavSlug } from "@/lib/experience-page-slug";
import { pageAppliesToUsageType, setPageUsageType } from "@/lib/usage-type-pages";
import { reapplyPageUsageTypeVisibility } from "@/lib/usage-type-page-visibility";

/** Master portal pages and whether each applies to this usage type. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const templates = await getExperienceMasterTemplates();
    const pages = templates
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        slug: sectionNavSlug(t),
        title: t.title,
        visible: t.visible,
        applies: pageAppliesToUsageType(t.usageTypeIds ?? [], id),
        appliesToAll: (t.usageTypeIds ?? []).length === 0,
      }));
    return jsonOk({ pages });
  } catch (e) {
    return handleApiError(e);
  }
}

const bodySchema = z.object({ slug: z.string().min(1), applies: z.boolean() });

/**
 * Include/exclude one master page for this usage type. Changes only that page's
 * usageTypeIds on the server, so designer content is never round-tripped here.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("slug and applies are required");

    const allIds = (await prisma.usageType.findMany({ select: { id: true } })).map((u) => u.id);
    if (!allIds.includes(id)) return jsonError("Usage type not found", 404);

    const templates = await getExperienceMasterTemplates();
    const index = templates.findIndex((t) => sectionNavSlug(t) === parsed.data.slug);
    if (index < 0) return jsonError("Page not found", 404);

    const next = setPageUsageType(templates[index]!.usageTypeIds ?? [], id, parsed.data.applies, allIds);
    if (next === null) {
      return jsonError("A page must apply to at least one usage type. Hide it in the Portal Designer instead.");
    }
    const updated = templates.map((t, i) => (i === index ? { ...t, usageTypeIds: next } : t));
    await upsertPortalContent({ experienceTemplates: updated });
    // Live proposals follow the warehouse: re-apply this page's visibility on them.
    const proposalsUpdated = await reapplyPageUsageTypeVisibility(parsed.data.slug);
    return jsonOk({ slug: parsed.data.slug, usageTypeIds: next, proposalsUpdated });
  } catch (e) {
    return handleApiError(e);
  }
}
