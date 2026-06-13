import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "state-cost-factors",
      (where, { skip, take }) =>
        prisma.stateCostFactor.findMany({
          where,
          skip,
          take,
          orderBy: { state: "asc" },
        }),
      () => prisma.stateCostFactor.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          state: r.state,
          registrationTaxRatePct: dec(r.registrationTaxRatePct),
          jetFuelTaxDifferentialPerGal: dec(r.jetFuelTaxDifferentialPerGal),
          registrationNotes: r.registrationNotes,
          taxNotes: r.taxNotes,
          source: r.source,
          lastReviewed: dateStr(r.lastReviewed),
        }))
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const state = parseOptionalString(body.state)?.toUpperCase();
    if (!state) return jsonError("state required");

    const row = await prisma.stateCostFactor.create({
      data: {
        state,
        registrationTaxRatePct: parseOptionalDecimal(body.registrationTaxRatePct),
        jetFuelTaxDifferentialPerGal: parseOptionalDecimal(body.jetFuelTaxDifferentialPerGal),
        registrationNotes: parseOptionalString(body.registrationNotes),
        taxNotes: parseOptionalString(body.taxNotes),
        source: parseOptionalString(body.source),
        lastReviewed: parseOptionalDate(body.lastReviewed),
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
