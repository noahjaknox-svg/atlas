import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  normalizePageSlug,
  slugifyPageTitle,
  validatePageSlug,
} from "@/lib/experience-page-slug";
import type { ExperienceContentBlocks } from "@/lib/experience-content";

const createCustomPageSchema = z.object({
  title: z.string().min(1).max(120),
  pageSlug: z.string().optional(),
  sortOrder: z.number().int().optional(),
  copyFromSectionId: z.string().optional(),
});

/** Create a custom portal page for a proposal. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const body = await request.json();
    const parsed = createCustomPageSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid payload");
    }

    const { title, copyFromSectionId } = parsed.data;
    const pageSlug = normalizePageSlug(parsed.data.pageSlug ?? slugifyPageTitle(title));
    const slugError = validatePageSlug(pageSlug);
    if (slugError) return jsonError(slugError);

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, deletedAt: null },
      select: { id: true },
    });
    if (!proposal) return jsonError("Proposal not found", 404);

    const existingSlug = await prisma.proposalSection.findFirst({
      where: { proposalId, pageSlug },
    });
    if (existingSlug) return jsonError("A page with this URL slug already exists");

    let sortOrder = parsed.data.sortOrder;
    if (sortOrder == null) {
      const maxOrder = await prisma.proposalSection.aggregate({
        where: { proposalId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;
    }

    let seed: Partial<{
      bodyCopy: string | null;
      contentBlocks: ExperienceContentBlocks | null;
      imageUrl: string | null;
      layoutVariant: string | null;
    }> = {};

    if (copyFromSectionId) {
      const source = await prisma.proposalSection.findFirst({
        where: { id: copyFromSectionId, proposalId },
      });
      if (source) {
        seed = {
          bodyCopy: source.bodyCopy,
          contentBlocks: source.contentBlocks as ExperienceContentBlocks | null,
          imageUrl: source.imageUrl,
          layoutVariant: source.layoutVariant,
        };
      }
    }

    const section = await prisma.proposalSection.create({
      data: {
        proposalId,
        sectionType: "custom_page",
        pageSlug,
        title: title.trim(),
        sortOrder,
        visible: true,
        bodyCopy: seed.bodyCopy ?? null,
        contentBlocks: (seed.contentBlocks ?? undefined) as Prisma.InputJsonValue | undefined,
        imageUrl: seed.imageUrl ?? null,
        layoutVariant: seed.layoutVariant ?? null,
      },
    });

    return jsonOk(section);
  } catch (e) {
    return handleApiError(e);
  }
}
