import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

/** Delete a custom portal page (custom_page sections only). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId, sectionId } = await params;

    const section = await prisma.proposalSection.findFirst({
      where: { id: sectionId, proposalId },
    });
    if (!section) return jsonError("Section not found", 404);
    if (section.sectionType !== "custom_page") {
      return jsonError("Only custom pages can be deleted");
    }

    await prisma.proposalSection.delete({ where: { id: sectionId } });
    return jsonOk({ deleted: sectionId });
  } catch (e) {
    return handleApiError(e);
  }
}
