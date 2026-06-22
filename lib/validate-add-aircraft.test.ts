import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    warehouseAircraft: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/fbo-airport-lookup", () => ({
  findFbosAtAirport: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";
import { validateAddAircraftBody } from "@/lib/validate-add-aircraft";

describe("validateAddAircraftBody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing warehouse aircraft id", async () => {
    const result = await validateAddAircraftBody({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/select an aircraft model/i);
  });

  it("rejects unknown warehouse aircraft id", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue(null);
    const result = await validateAddAircraftBody({
      aircraftMasterId: "missing-id",
      proposedHomeBase: "KSDL",
      fboName: "PrismJet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found in the warehouse/i);
  });

  it("rejects invalid home base code", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue({
      id: "wa-1",
      status: "published",
      displayName: "Bombardier Challenger 300",
      manufacturer: "Bombardier",
      model: "Challenger 300",
    } as never);

    const result = await validateAddAircraftBody({
      aircraftMasterId: "wa-1",
      proposedHomeBase: "bad!",
      fboName: "PrismJet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid 3–4 character/i);
  });

  it("rejects FBO not at airport", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue({
      id: "wa-1",
      status: "published",
      displayName: "Bombardier Challenger 300",
      manufacturer: "Bombardier",
      model: "Challenger 300",
    } as never);
    vi.mocked(findFbosAtAirport).mockResolvedValue([
      { fboName: "Other FBO" },
    ] as never);

    const result = await validateAddAircraftBody({
      aircraftMasterId: "wa-1",
      proposedHomeBase: "KSDL",
      fboName: "PrismJet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not found at KSDL/i);
  });

  it("accepts valid payload", async () => {
    vi.mocked(prisma.warehouseAircraft.findUnique).mockResolvedValue({
      id: "713b06f8-7342-4eab-a9b8-602c4aa2a5ad",
      status: "published",
      displayName: "Bombardier Challenger 300",
      manufacturer: "Bombardier",
      model: "Challenger 300",
    } as never);
    vi.mocked(findFbosAtAirport).mockResolvedValue([
      { fboName: "PrismJet" },
    ] as never);

    const result = await validateAddAircraftBody({
      aircraftMasterId: "713b06f8-7342-4eab-a9b8-602c4aa2a5ad",
      proposedHomeBase: "KSDL",
      fboName: "PrismJet",
      usageType: "part_91",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        aircraftModel: "Bombardier Challenger 300",
        aircraftMasterId: "713b06f8-7342-4eab-a9b8-602c4aa2a5ad",
        proposedHomeBase: "KSDL",
        fboName: "PrismJet",
        usageType: "part_91",
        manufacturer: "Bombardier",
        model: "Challenger 300",
      },
    });
  });
});
