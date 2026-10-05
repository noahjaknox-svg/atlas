import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { resolveUsageTypeAssumptions } from "@/lib/resolve-aircraft-defaults";
import type { AssumptionSourceType, DataConfidence } from "@prisma/client";
import { applyUsageTypeVisibility } from "@/lib/usage-type-page-visibility";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const assumptions = await prisma.proposalAssumption.findMany({
      where: { proposalId: id },
      orderBy: [{ category: "asc" }, { assumptionName: "asc" }],
    });
    return jsonOk(assumptions);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.assumptions ?? [body];

    for (const item of items) {
      if (!item.category || !item.assumptionName) {
        return jsonError("Each assumption requires category and assumptionName");
      }
    }

    type AssumptionItem = {
      category: string;
      assumptionName: string;
      value?: unknown;
      unit?: string;
      sourceType?: AssumptionSourceType;
      sourceId?: string;
      confidence?: DataConfidence;
      visibleToClient?: boolean;
      editableByClient?: boolean;
      internalNote?: string;
      clientExplanation?: string;
    };

    const results = await prisma.$transaction(
      (items as AssumptionItem[]).map((item) =>
        prisma.proposalAssumption.upsert({
          where: {
            proposalId_category_assumptionName: {
              proposalId,
              category: item.category,
              assumptionName: item.assumptionName,
            },
          },
          create: {
            proposalId,
            category: item.category,
            assumptionName: item.assumptionName,
            value: String(item.value ?? ""),
            unit: item.unit,
            sourceType: (item.sourceType as AssumptionSourceType) ?? "manual",
            sourceId: item.sourceId,
            confidence: (item.confidence as DataConfidence) ?? "medium",
            visibleToClient: item.visibleToClient ?? true,
            editableByClient: item.editableByClient ?? false,
            internalNote: item.internalNote,
            clientExplanation: item.clientExplanation,
          },
          update: {
            value: String(item.value ?? ""),
            unit: item.unit,
            sourceType: item.sourceType,
            confidence: item.confidence,
            visibleToClient: item.visibleToClient,
            editableByClient: item.editableByClient,
            internalNote: item.internalNote,
            clientExplanation: item.clientExplanation,
          },
        })
      )
    );

    const usageTypeChanges = (items as AssumptionItem[]).filter(
      (item) => item.assumptionName === "usage_type" && item.value != null
    );
    for (const item of usageTypeChanges) {
      const usageTypeName = String(item.value);
      // Aircraft categories are `ac_<aircraftInstanceId>`; switching usage type resets that
      // aircraft's charter flag and line settings to the usage type's configuration.
      const aircraftInstanceId = item.category.startsWith("ac_") ? item.category.slice(3) : null;
      const patch = aircraftInstanceId
        ? await resolveUsageTypeAssumptions({
            aircraftInstanceId,
            assumptions: { usage_type: usageTypeName },
            usageTypeName,
          })
        : undefined;
      for (const [assumptionName, value] of Object.entries(patch ?? {})) {
        await prisma.proposalAssumption.upsert({
          where: {
            proposalId_category_assumptionName: {
              proposalId,
              category: item.category,
              assumptionName,
            },
          },
          create: { proposalId, category: item.category, assumptionName, value, sourceType: "manual" },
          update: { value },
        });
      }
      await applyUsageTypeVisibility(proposalId, usageTypeName);
    }

    return jsonOk(results);
  } catch (e) {
    return handleApiError(e);
  }
}
