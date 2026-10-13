import { expect, test, type Page } from "@playwright/test";

// The designer canvas must lay blocks out the way the published portal does: same vertical rhythm,
// same row sizing, padding in the same place. We load identical blocks in both and compare how far
// apart the elements sit (relative offsets, so the canvas's narrower pane doesn't matter).

test.use({ viewport: { width: 1600, height: 1100 } });

const DESIGNER = "/aircraft-management/proposal-design";
const text = (id: string, markdown: string, blockLayout?: object) => ({ id, type: "text", markdown, ...(blockLayout ? { blockLayout } : {}) });

const BLOCKS = [
  text("a", "PAR-A", { padding: "lg" }),
  text("b", "PAR-B"),
  {
    id: "box", type: "container", rows: 2, cols: 1, gap: "lg",
    columnWeights: [1], rowWeights: [1, 1],
    blockLayout: { widthDesktop: "full" },
    // Unequal rows: the portal equalises 1fr rows, so the second marker sits lower than content alone implies.
    cells: [[[text("c", "PAR-C"), text("c2", "PAR-C2"), text("c3", "PAR-C3")]], [[text("d", "PAR-D")]]],
  },
  text("e", "PAR-E"),
];
const MARKERS = ["PAR-A", "PAR-B", "PAR-C", "PAR-D", "PAR-E"];

async function offsets(page: Page, selector: string) {
  const tops = await page.evaluate(
    ({ sel, ms }) => {
      const all = Array.from(document.querySelectorAll(sel));
      return ms.map((m) => {
        const el = all.find((e) => e.textContent?.trim() === m);
        return el ? el.getBoundingClientRect().top : null;
      });
    },
    { sel: selector, ms: MARKERS }
  );
  expect(tops.every((t) => t != null)).toBe(true);
  const base = tops[0]!;
  return tops.map((t) => Math.round(t! - base));
}

test("canvas spacing matches the published layout (rows, gaps, padding)", async ({ page }) => {
  // Real portal rendering via the preview endpoint.
  const content = await (await page.request.get("/api/portal-content")).json();
  const about = (content.content.experienceTemplates as Array<{ sectionType: string }>).find((t) => t.sectionType === "about_us")!;
  const res = await page.request.post("/api/portal-content/designer-preview", {
    data: { sections: [{ ...about, visible: true, contentBlocks: { pageBlocks: BLOCKS } }], activePageSlug: "about-us" },
  });
  const { token } = await res.json();
  await page.goto(`/aircraft-management/proposal-design/preview?previewToken=${token}&page=about-us`);
  await expect(page.getByText("PAR-E", { exact: true })).toBeVisible();
  const published = await offsets(page, ".portal-markdown");

  // The same blocks in the designer canvas, guides off (guides add min-heights by design).
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: BLOCKS };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await page.getByRole("button", { name: /^Page code/i }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: "PAR-E" })).toBeVisible();
  await page.getByRole("button", { name: /Guides/ }).click();
  await expect(page.getByRole("button", { name: /Guides: off/ })).toBeVisible();
  const canvas = await offsets(page, ".design-shell .portal-markdown");

  for (let i = 0; i < MARKERS.length; i++) {
    expect(Math.abs(canvas[i]! - published[i]!), `${MARKERS[i]}: canvas ${canvas[i]} vs published ${published[i]}`).toBeLessThanOrEqual(6);
  }
});

test("'Show on' hides by breakpoint without breaking the cell's flex layout", async ({ page }) => {
  const blocks = [
    {
      id: "box", type: "container", rows: 1, cols: 1, gap: "md", columnWeights: [1], rowWeights: [1],
      blockLayout: { widthDesktop: "full" },
      cells: [[[
        { id: "d", type: "text", markdown: "VIS-DESKTOP", blockLayout: { visibility: "desktop" } },
        { id: "m", type: "text", markdown: "VIS-MOBILE", blockLayout: { visibility: "mobile" } },
      ]]],
    },
  ];
  const content = await (await page.request.get("/api/portal-content")).json();
  const about = (content.content.experienceTemplates as Array<{ sectionType: string }>).find((t) => t.sectionType === "about_us")!;
  const res = await page.request.post("/api/portal-content/designer-preview", {
    data: { sections: [{ ...about, visible: true, contentBlocks: { pageBlocks: blocks } }], activePageSlug: "about-us" },
  });
  const { token } = await res.json();
  const url = `/aircraft-management/proposal-design/preview?previewToken=${token}&page=about-us`;
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(url);
  await expect(page.getByText("VIS-DESKTOP", { exact: true })).toBeVisible();
  await expect(page.getByText("VIS-MOBILE", { exact: true })).toBeHidden();
  // Shown, and still the flex column the cell gave it (not forced to display:block).
  const display = await page.locator(".portal-layout-show-desktop").first().evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe("flex");

  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.getByText("VIS-DESKTOP", { exact: true })).toBeHidden();
  await expect(page.getByText("VIS-MOBILE", { exact: true })).toBeVisible();
});
