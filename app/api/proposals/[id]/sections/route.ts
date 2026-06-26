import type { Prisma } from "@prisma/client";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  sanitizeExperiencePageLinks,
  type ExperienceContentBlocks,
} from "@/lib/experience-content";

/**
 * Per-proposal section edits are limited to copy, page selection (visible),
 * order, signatory, the per-proposal aircraft market link, and custom page
 * link buttons. Structure, media, layout, and rich content blocks are owned
 * globally by the Deck Builder (Proposal Design) and are intentionally ignored
 * here.
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
    for (const item of items) {
      if (!item.id) return jsonError("Each section requires id");
      const existing = await prisma.proposalSection.findFirst({
        where: { id: item.id, proposalId },
        select: { id: true, contentBlocks: true },
      });
      if (!existing) return jsonError("Section not found", 404);

      const data: Prisma.ProposalSectionUpdateInput = {
        title: item.title,
        bodyCopy: item.bodyCopy,
        visible: typeof item.visible === "boolean" ? item.visible : undefined,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : undefined,
        signatoryName: item.signatoryName !== undefined ? item.signatoryName : undefined,
        signatoryTitle: item.signatoryTitle !== undefined ? item.signatoryTitle : undefined,
      };

      // Only the per-proposal aircraft market link is editable within contentBlocks.
      if (item.contentBlocks && typeof item.contentBlocks === "object") {
        const incoming = item.contentBlocks as ExperienceContentBlocks;
        const current = (existing.contentBlocks as ExperienceContentBlocks | null) ?? {};
        const merged: ExperienceContentBlocks = { ...current };
        if ("aircraftMarketUrl" in incoming) {
          merged.aircraftMarketUrl = incoming.aircraftMarketUrl ?? null;
        }
        if ("aircraftMarketButtonLabel" in incoming) {
          merged.aircraftMarketButtonLabel = incoming.aircraftMarketButtonLabel ?? null;
        }
        if ("navLinks" in incoming) {
          merged.navLinks = sanitizeExperiencePageLinks(incoming.navLinks);
        }
        data.contentBlocks = merged as unknown as Prisma.InputJsonValue;
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
