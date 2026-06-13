import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { buildDataHubQuery, parseDataHubFilters } from "@/lib/data-hub-filters";

export type DataHubListPayload = {
  rows: Record<string, unknown>[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

const CRUD_TABS = new Set([
  "airports",
  "aircraft",
  "operating",
  "crew",
  "programs",
  "training",
  "insurance",
  "hangar",
  "taxes",
  "charter",
  "scenarios",
]);

function buildPrefetchRequest(searchParams: URLSearchParams): Request {
  const url = new URL("http://local/prefetch");
  searchParams.forEach((value, key) => {
    if (key !== "tab") url.searchParams.set(key, value);
  });
  return new Request(url);
}

export function isPrefetchableDataHubTab(tab: string): boolean {
  return CRUD_TABS.has(tab);
}

export async function prefetchDataHubTab(
  tab: string,
  searchParams: URLSearchParams
): Promise<DataHubListPayload | null> {
  if (!CRUD_TABS.has(tab)) return null;

  const request = buildPrefetchRequest(searchParams);
  const asPayload = <T>(promise: Promise<T>) => promise as Promise<DataHubListPayload>;

  switch (tab) {
    case "airports":
      return asPayload(
        fetchDataHubList(
          request,
          "airports",
          (where, { skip, take }) =>
            prisma.airport.findMany({
              where,
              skip,
              take,
              orderBy: { icao: "asc" },
              include: { _count: { select: { fboLocations: true } } },
            }),
          () => prisma.airport.count(),
          (airports) =>
            airports.map((a) => ({
              id: a.id,
              icao: a.icao,
              airportName: a.airportName,
              city: a.city,
              state: a.state,
              country: a.country,
              fboCount: a._count.fboLocations,
            }))
        )
      );

    case "aircraft":
      return asPayload(fetchDataHubList(
        request,
        "aircraft-master",
        (where, { skip, take }) =>
          prisma.aircraftMaster.findMany({
            where,
            skip,
            take,
            orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
          }),
        () => prisma.aircraftMaster.count(),
        (rows) =>
          rows.map((a) => ({
            id: a.id,
            manufacturer: a.manufacturer,
            model: a.model,
            variant: a.variant,
            aircraftCategory: a.aircraftCategory,
            typicalFuelBurnGph: dec(a.typicalFuelBurnGph),
            typicalCharterRate: dec(a.typicalCharterRate),
            maxRecommendedUtilization: a.maxRecommendedUtilization,
            cabinSqft: a.cabinSqft,
            typicalHullValue: dec(a.typicalHullValue),
            dataConfidence: a.dataConfidence,
          }))
      ));

    case "operating":
      return asPayload(fetchDataHubList(
        request,
        "operating-defaults",
        (where, { skip, take }) =>
          prisma.aircraftOperatingDefault.findMany({
            where,
            skip,
            take,
            orderBy: { costKey: "asc" },
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
            },
          }),
        () => prisma.aircraftOperatingDefault.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
            costKey: r.costKey,
            annualAmount: dec(r.annualAmount),
            effectiveDate: dateStr(r.effectiveDate),
            source: r.source,
          }))
      ));

    case "crew":
      return asPayload(fetchDataHubList(
        request,
        "crew-rates",
        (where, { skip, take }) =>
          prisma.crewRate.findMany({
            where,
            skip,
            take,
            orderBy: { role: "asc" },
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
            },
          }),
        () => prisma.crewRate.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
            role: r.role,
            salaryBase: dec(r.salaryBase),
            benefitsPercent: dec(r.benefitsPercent),
            effectiveDate: dateStr(r.effectiveDate),
          }))
      ));

    case "programs":
      return asPayload(fetchDataHubList(
        request,
        "program-costs",
        (where, { skip, take }) =>
          prisma.programCost.findMany({
            where,
            skip,
            take,
            orderBy: { programType: "asc" },
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
            },
          }),
        () => prisma.programCost.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
            programType: r.programType,
            provider: r.provider,
            hourlyRate: dec(r.hourlyRate),
            effectiveDate: dateStr(r.effectiveDate),
          }))
      ));

    case "training":
      return asPayload(fetchDataHubList(
        request,
        "training-costs",
        (where, { skip, take }) =>
          prisma.trainingCost.findMany({
            where,
            skip,
            take,
            orderBy: { role: "asc" },
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
            },
          }),
        () => prisma.trainingCost.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
            role: r.role,
            trainingType: r.trainingType,
            annualCost: dec(r.annualCost),
            provider: r.provider,
            effectiveDate: dateStr(r.effectiveDate),
          }))
      ));

    case "insurance":
      return asPayload(fetchDataHubList(
        request,
        "insurance-assumptions",
        (where, { skip, take }) =>
          prisma.insuranceAssumption.findMany({
            where,
            skip,
            take,
            orderBy: { state: "asc" },
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
            },
          }),
        () => prisma.insuranceAssumption.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
            state: r.state,
            annualPremiumEstimate: dec(r.annualPremiumEstimate),
            effectiveDate: dateStr(r.effectiveDate),
          }))
      ));

    case "hangar":
      return asPayload(fetchDataHubList(
        request,
        "hangar-costs",
        (where, { skip, take }) =>
          prisma.hangarCost.findMany({
            where,
            skip,
            take,
            include: {
              airport: { select: { icao: true } },
              aircraftMaster: { select: { manufacturer: true, model: true } },
              fboLocation: { select: { fboName: true } },
            },
            orderBy: { updatedAt: "desc" },
          }),
        () => prisma.hangarCost.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            airportId: r.airportId,
            airportIcao: r.airport.icao,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: r.aircraftMaster
              ? `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`
              : null,
            fboLocationId: r.fboLocationId,
            fboName: r.fboLocation?.fboName ?? null,
            provider: r.provider,
            pricingMethod: r.pricingMethod,
            quotedAnnual: dec(r.quotedAnnual),
            ratePerSqftAnnual: dec(r.ratePerSqftAnnual),
            effectiveDate: dateStr(r.effectiveDate),
          }))
      ));

    case "taxes":
      return asPayload(fetchDataHubList(
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
          }))
      ));

    case "charter":
      return asPayload(fetchDataHubList(
        request,
        "charter-rates",
        (where, { skip, take }) =>
          prisma.charterMarketRate.findMany({
            where,
            skip,
            take,
            orderBy: { effectiveDate: "desc" },
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
              airport: { select: { icao: true } },
            },
          }),
        () => prisma.charterMarketRate.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
            airportId: r.airportId,
            airportIcao: r.airport?.icao ?? null,
            retailRateBase: dec(r.retailRateBase),
            fuelSurcharge: dec(r.fuelSurcharge),
            ownerPaybackPercent: dec(r.ownerPaybackPercent),
            effectiveDate: dateStr(r.effectiveDate),
          }))
      ));

    case "scenarios":
      return asPayload(fetchDataHubList(
        request,
        "scenario-templates",
        (where, { skip, take }) =>
          prisma.scenarioTemplate.findMany({
            where,
            skip,
            take,
            include: {
              aircraftMaster: { select: { manufacturer: true, model: true } },
              assumptions: true,
            },
            orderBy: { name: "asc" },
          }),
        () => prisma.scenarioTemplate.count(),
        (rows) =>
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            aircraftMasterId: r.aircraftMasterId,
            aircraft: r.aircraftMaster
              ? `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`
              : "—",
            description: r.description,
            assumptions: r.assumptions.map((a) => ({
              id: a.id,
              assumptionKey: a.assumptionKey,
              value: a.value,
            })),
          }))
      ));

    default:
      return null;
  }
}

export function dataHubSearchParamsFromRecord(
  params: Record<string, string | undefined>
): URLSearchParams {
  const filters = parseDataHubFilters({
    get: (key: string) => params[key] ?? null,
  });
  const qs = buildDataHubQuery(filters);
  if (params.tab) qs.set("tab", params.tab);
  return qs;
}

/** Prefetch airports + fbos for the combined airports tab. */
export async function prefetchAirportsTabData(
  searchParams: URLSearchParams
): Promise<{ airports: DataHubListPayload; fbos: DataHubListPayload }> {
  const request = buildPrefetchRequest(searchParams);
  const [airports, fbos] = await Promise.all([
    fetchDataHubList(
      request,
      "airports",
      (where, { skip, take }) =>
        prisma.airport.findMany({
          where,
          skip,
          take,
          orderBy: { icao: "asc" },
          include: { _count: { select: { fboLocations: true } } },
        }),
      () => prisma.airport.count(),
      (rows) =>
        rows.map((a) => ({
          id: a.id,
          icao: a.icao,
          airportName: a.airportName,
          city: a.city,
          state: a.state,
          country: a.country,
          fboCount: a._count.fboLocations,
        }))
    ),
    fetchDataHubList(
      request,
      "fbos",
      (where, { skip, take }) =>
        prisma.fboLocation.findMany({
          where,
          skip,
          take,
          orderBy: { fboName: "asc" },
          include: { airport: { select: { icao: true, airportName: true } } },
        }),
      () => prisma.fboLocation.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          airportId: r.airportId,
          airportIcao: r.airport.icao,
          fboName: r.fboName,
          jetARetailPrice: dec(r.jetARetailPrice),
          jetAContractPrice: dec(r.jetAContractPrice),
          phone: r.phone,
          website: r.website,
          manualOverride: r.manualOverride,
        }))
    ),
  ]);
  return {
    airports: airports as DataHubListPayload,
    fbos: fbos as DataHubListPayload,
  };
}
