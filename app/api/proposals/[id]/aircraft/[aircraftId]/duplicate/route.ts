import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId, aircraftId } = await params;

    const source = await prisma.aircraftInstance.findUnique({
      where: { id: aircraftId },
    });
    if (!source) throw new Error("NOT_FOUND");

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { prospectId: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const copy = await prisma.aircraftInstance.create({
      data: {
        prospectId: proposal.prospectId,
        proposalId,
        warehouseAircraftId: source.warehouseAircraftId,
        year: source.year,
        proposedHomeBaseIcao: source.proposedHomeBaseIcao,
        tailNumber: source.tailNumber,
        estimatedValue: source.estimatedValue,
      },
      include: { warehouseAircraft: true },
    });

    const srcCategory = aircraftAssumptionCategory(aircraftId);
    const dstCategory = aircraftAssumptionCategory(copy.id);
    const srcAssumptions = await prisma.proposalAssumption.findMany({
      where: { proposalId, category: srcCategory },
    });

    if (srcAssumptions.length > 0) {
      await prisma.proposalAssumption.createMany({
        data: srcAssumptions.map((a) => ({
          proposalId,
          category: dstCategory,
          assumptionName: a.assumptionName,
          value: a.value,
          unit: a.unit,
          sourceType: a.sourceType,
          confidence: a.confidence,
          visibleToClient: a.visibleToClient,
          editableByClient: a.editableByClient,
        })),
      });
    } else {
      const model = await prisma.proposalAssumption.findFirst({
        where: { proposalId, assumptionName: "aircraft_model", category: srcCategory },
      });
      if (model) {
        await prisma.proposalAssumption.create({
          data: {
            proposalId,
            category: dstCategory,
            assumptionName: "aircraft_model",
            value: `${model.value} (copy)`,
            sourceType: "manual",
          },
        });
      }
    }

    await prisma.proposalScenario.create({
      data: {
        proposalId,
        aircraftInstanceId: copy.id,
        scenarioName: "Base Case",
        isBaseCase: false,
      },
    });

    return jsonOk({ aircraft: copy }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
