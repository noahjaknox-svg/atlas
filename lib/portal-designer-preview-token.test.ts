import { describe, expect, it } from "vitest";
import {
  createDesignerPreviewToken,
  verifyDesignerPreviewToken,
} from "./portal-designer-preview-token";
import { clearDesignerPreviewStore } from "./portal-designer-preview-store";

describe("portal-designer-preview-token", () => {
  it("uses a short preview id that fits in a URL", async () => {
    clearDesignerPreviewStore();
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
});
