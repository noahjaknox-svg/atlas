import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

function parseOptionalGradient(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}

function parseOptionalEndIdent(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return String(v).trim().toUpperCase();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const row = await prisma.airportRunwayReference.update({
      where: { id },
      data: {
        gradientPctVerified: parseOptionalGradient(body.gradientPctVerified),
        gradientHighEndVerified: parseOptionalEndIdent(body.gradientHighEndVerified),
      },
    });

    return jsonOk({
      id: row.id,
      gradientPctVerified: row.gradientPctVerified,
      gradientHighEndVerified: row.gradientHighEndVerified,
      gradientPctEstimated: row.gradientPctEstimated,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
