import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const count = vi.fn();
const userFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    proposal: { findMany, count },
    user: { findMany: userFindMany },
  },
}));

vi.mock("@/lib/pipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pipeline")>();
  return {
    ...actual,
    getCardSubtitle: () => null,
    getPipelineBadges: () => [],
  };
});

vi.mock("@/lib/required-fields", () => ({
  getMissingRequiredFields: () => [],
}));

import { loadPipelinePage } from "@/lib/pipeline-load";

describe("loadPipelinePage", () => {
  beforeEach(() => {
    findMany.mockReset();
    count.mockReset();
    userFindMany.mockReset();
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    userFindMany.mockResolvedValue([]);
  });

  it("loads active proposals with deletedAt null filter", async () => {
    await loadPipelinePage(1);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
      })
    );
    expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
  });

  it("loads archived proposals with deletedAt not null filter", async () => {
    await loadPipelinePage(1, { archived: true });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      })
    );
    expect(count).toHaveBeenCalledWith({ where: { deletedAt: { not: null } } });
  });

  it("returns archived flag in response", async () => {
    const active = await loadPipelinePage(1);
    expect(active.archived).toBe(false);

    const archived = await loadPipelinePage(1, { archived: true });
    expect(archived.archived).toBe(true);
  });

  it("includes deletedAt on card payloads", async () => {
    const deletedAt = new Date("2026-01-15T12:00:00.000Z");
    findMany.mockResolvedValue([
      {
        id: "p1",
        prospect: { prospectName: "Acme", companyName: null, assignedToId: null },
        aircraftInstance: null,
        pipelineStage: "lead_research",
        status: "draft",
        isParked: false,
        updatedAt: deletedAt,
        deletedAt,
        clientPortal: null,
        assumptions: [],
      },
    ]);

    const result = await loadPipelinePage(1, { archived: true });
    expect(result.cards[0]?.deletedAt).toBe(deletedAt.toISOString());
  });
});
