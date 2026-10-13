import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { CLUB_DEFAULTS } from "@/lib/club-proforma";
import { validateClubInputsPatch } from "@/lib/club-model-store";
import { loadClubInputs, saveClubInputs } from "@/lib/club-model-server";

/** Silverleaf club model inputs for a proposal (staff only). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const inputs = await loadClubInputs(id);
    return jsonOk({ enabled: inputs != null, inputs: inputs ?? CLUB_DEFAULTS });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Merge a (validated) partial update into the stored inputs; creates them from defaults if missing. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const proposal = await prisma.proposal.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!proposal) return jsonError("Proposal not found", 404);

    const body = await request.json();
    const checked = validateClubInputsPatch(body?.inputs ?? body);
    if (!checked.ok) return jsonError(checked.error);

    const current = (await loadClubInputs(id)) ?? { ...CLUB_DEFAULTS };
    const next = { ...current, ...checked.value };
    await saveClubInputs(id, next);
    return jsonOk({ enabled: true, inputs: next });
  } catch (e) {
    return handleApiError(e);
  }
}
