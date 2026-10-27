import { describe, expect, it } from "vitest";
import {
  designerSectionKey,
  withMasterSectionIds,
  withoutDesignerIds,
  type DesignerSection,
} from "@/components/internal/portal-designer/portal-designer-types";
import { silverleafMasterTemplates } from "@/lib/silverleaf-pages";

const masterPages = silverleafMasterTemplates("type-1") as unknown as DesignerSection[];
const system = { sectionType: "welcome", title: "Welcome" } as DesignerSection;

describe("designerSectionKey", () => {
  it("uses the id when there is one (proposal pages)", () => {
    expect(designerSectionKey({ id: "abc", sectionType: "custom_page", pageSlug: "x" })).toBe("abc");
  });

  it("tells master custom pages apart by web address, not by their shared section type", () => {
    const keys = masterPages.map((p) => designerSectionKey(p));
    expect(new Set(keys).size).toBe(masterPages.length);
    expect(keys.every((k) => k.startsWith("custom_page:"))).toBe(true);
  });

  it("keys the fixed pages by type", () => {
    expect(designerSectionKey(system)).toBe("welcome");
  });
});

describe("master page ids", () => {
  const withIds = withMasterSectionIds([system, ...masterPages]);

  it("gives every custom page a unique id and leaves fixed pages alone", () => {
    expect(withIds[0]).toBe(system);
    const ids = withIds.slice(1).map((p) => p.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(masterPages.length);
  });

  it("keeps an id that is already there", () => {
    const [kept] = withMasterSectionIds([{ ...masterPages[0]!, id: "custom_123" }]);
    expect(kept!.id).toBe("custom_123");
  });

  it("an edit to the selected page changes only that page", () => {
    const active = designerSectionKey(withIds[3]!);
    const next = withIds.map((s) => (designerSectionKey(s) === active ? { ...s, title: "Edited" } : s));
    expect(next.filter((s) => s.title === "Edited")).toHaveLength(1);
    expect(next[3]!.title).toBe("Edited");
  });

  it("strips the designer-only ids before saving, so storage never holds them", () => {
    const saved = withoutDesignerIds(withIds);
    expect(saved.every((s) => !("id" in s))).toBe(true);
    expect(saved).toHaveLength(withIds.length);
    // Round trip: loading the saved pages again gives the same keys.
    expect(withMasterSectionIds(saved as DesignerSection[]).map((s) => s.id)).toEqual(withIds.map((s) => s.id));
  });
});
