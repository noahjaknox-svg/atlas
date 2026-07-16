import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    aircraftType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { resolveValidAircraftTypeId } from "@/lib/resolve-warehouse-aircraft-id";

describe("resolveValidAircraftTypeId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers a valid instance warehouse id", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue({ id: "inst-1" } as never);

    const result = await resolveValidAircraftTypeId({
      instanceWarehouseId: "inst-1",
      assumptionMasterId: "stale-1",
    });

    expect(result).toEqual({
      id: "inst-1",
      source: "instance",
      staleAssumptionId: "stale-1",
    });
  });

  it("uses a valid assumption id when instance is missing", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue({ id: "valid-1" } as never);

    const result = await resolveValidAircraftTypeId({
      assumptionMasterId: "valid-1",
    });

    expect(result).toEqual({
      id: "valid-1",
      source: "assumption",
      staleAssumptionId: null,
    });
  });

  it("falls back to published manufacturer/model when assumption id is stale", async () => {
    vi.mocked(prisma.aircraftType.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.aircraftType.findFirst).mockResolvedValue({
      id: "713b06f8-7342-4eab-a9b8-602c4aa2a5ad",
    } as never);

    const result = await resolveValidAircraftTypeId({
      assumptionMasterId: "ec5d6b1b-29cf-4d1b-ade6-52c2bf1d36da",
      manufacturer: "Bombardier",
      model: "Challenger 300",
    });

    expect(result).toEqual({
      id: "713b06f8-7342-4eab-a9b8-602c4aa2a5ad",
      source: "model_match",
      staleAssumptionId: "ec5d6b1b-29cf-4d1b-ade6-52c2bf1d36da",
    });
  });
});
