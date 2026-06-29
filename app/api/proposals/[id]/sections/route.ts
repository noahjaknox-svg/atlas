import type { Prisma } from "@prisma/client";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  proposalSectionPatchSchema,
  sanitizeSectionContentBlocks,
} from "@/lib/experience-section-schema";
import type { ExperienceContentBlocks } from "@/lib/experience-content";
import { normalizePageSlug, validatePageSlug } from "@/lib/experience-page-slug";

/**
 * Per-proposal section edits update the proposal working copy (draft layer).
 * Published client portals read only from snapshots until republish.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.sections;

    if (!Array.isArray(items)) {
      return jsonError("Expected sections array");
    }

    const results = [];
    for (const raw of items) {
      const parsed = proposalSectionPatchSchema.safeParse(raw);
      if (!parsed.success) {
        return jsonError(parsed.error.errors[0]?.message ?? "Invalid section payload");
      }
      const item = parsed.data;

      const existing = await prisma.proposalSection.findFirst({
        where: { id: item.id, proposalId },
        select: { id: true, contentBlocks: true, sectionType: true, pageSlug: true },
      });
      if (!existing) return jsonError("Section not found", 404);

      const data: Prisma.ProposalSectionUpdateInput = {};
      if (item.title !== undefined) data.title = item.title;
      if (item.bodyCopy !== undefined) data.bodyCopy = item.bodyCopy;
      if (item.visible !== undefined) data.visible = item.visible;
      if (item.sortOrder !== undefined) data.sortOrder = item.sortOrder;
      if (item.signatoryName !== undefined) data.signatoryName = item.signatoryName;
      if (item.signatoryTitle !== undefined) data.signatoryTitle = item.signatoryTitle;
      if (item.imageUrl !== undefined) data.imageUrl = item.imageUrl;
      if (item.videoUrl !== undefined) data.videoUrl = item.videoUrl;
      if (item.posterUrl !== undefined) data.posterUrl = item.posterUrl;
      if (item.layoutVariant !== undefined) data.layoutVariant = item.layoutVariant;
      if (item.calloutMetricLabel !== undefined) {
        data.calloutMetricLabel = item.calloutMetricLabel;
      }
      if (item.calloutMetricValue !== undefined) {
        data.calloutMetricValue = item.calloutMetricValue;
      }

      if (item.pageSlug !== undefined) {
        if (existing.sectionType !== "custom_page") {
          return jsonError("Only custom pages can change URL slug");
        }
        if (item.pageSlug == null || !item.pageSlug.trim()) {
          return jsonError("Custom pages require a URL slug");
        }
        const normalized = normalizePageSlug(item.pageSlug);
        const slugError = validatePageSlug(normalized);
        if (slugError) return jsonError(slugError);
        if (normalized !== existing.pageSlug) {
          const conflict = await prisma.proposalSection.findFirst({
            where: { proposalId, pageSlug: normalized, NOT: { id: item.id } },
          });
          if (conflict) return jsonError("A page with this URL slug already exists");
        }
        data.pageSlug = normalized;
      }

      if (item.contentBlocks !== undefined) {
        const current = (existing.contentBlocks as ExperienceContentBlocks | null) ?? {};
        const sanitized = sanitizeSectionContentBlocks(item.contentBlocks);
        data.contentBlocks = {
          ...current,
          ...sanitized,
        } as unknown as Prisma.InputJsonValue;
      }

      const result = await prisma.proposalSection.update({
        where: { id: item.id },
        data,
      });
      results.push(result);
    }

    return jsonOk(results);
  } catch (e) {
    return handleApiError(e);
  }
}
