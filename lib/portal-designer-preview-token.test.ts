import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDesignerPreviewToken,
  verifyDesignerPreviewToken,
} from "./portal-designer-preview-token";
import {
  createMemoryPreviewBackend,
  setDesignerPreviewBackend,
} from "./portal-designer-preview-store";

const memory = createMemoryPreviewBackend();

describe("portal-designer-preview-token", () => {
  beforeEach(() => {
    memory.clear();
    setDesignerPreviewBackend(memory);
  });
  afterEach(() => {
    setDesignerPreviewBackend();
    vi.useRealTimers();
  });

  it("uses a short preview id that fits in a URL", async () => {
    const sections = Array.from({ length: 9 }, (_, i) => ({
      sectionType: "custom_page",
      pageSlug: `page-${i}`,
      title: `Page ${i}`,
      bodyCopy: "x".repeat(2000),
      visible: true,
      sortOrder: i + 1,
      contentBlocks: { pageBlocks: [{ id: `t${i}`, type: "text" as const, markdown: "y".repeat(2000) }] },
    }));

    const { token } = await createDesignerPreviewToken("master", {
      sections: sections as never,
      activePageSlug: "welcome",
      renderSchemaVersion: 3,
    });

    expect(token.length).toBeLessThan(64);
    const verified = await verifyDesignerPreviewToken(token);
    expect(verified?.proposalId).toBe("master");
    expect(verified?.payload.sections).toHaveLength(9);
  });

  it("rejects a preview after it expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00Z"));
    const { token } = await createDesignerPreviewToken("prop-1", {
      sections: [],
      activePageSlug: "about",
    });
    expect(await verifyDesignerPreviewToken(token)).not.toBeNull();
    vi.setSystemTime(new Date("2026-09-24T12:16:00Z")); // TTL is 15 minutes
    expect(await verifyDesignerPreviewToken(token)).toBeNull();
  });

  it("rejects unknown tokens", async () => {
    expect(await verifyDesignerPreviewToken("not-a-real-token")).toBeNull();
  });
});
