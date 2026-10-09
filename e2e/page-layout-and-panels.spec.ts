import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1000 } });

const DESIGNER = "/aircraft-management/proposal-design";
const text = (id: string, markdown: string, blockLayout?: object) => ({ id, type: "text", markdown, ...(blockLayout ? { blockLayout } : {}) });

/** Render blocks (+ page layout) through the real portal code via the designer's preview endpoint. */
async function renderPreview(page: Page, pageBlocks: object[], pageLayout?: object) {
  const content = await (await page.request.get("/api/portal-content")).json();
  const about = (content.content.experienceTemplates as Array<{ sectionType: string }>).find((t) => t.sectionType === "about_us")!;
  const res = await page.request.post("/api/portal-content/designer-preview", {
    data: { sections: [{ ...about, visible: true, contentBlocks: { pageBlocks, ...(pageLayout ? { pageLayout } : {}) } }], activePageSlug: "about-us" },
  });
  const { token } = await res.json();
  await page.goto(`/aircraft-management/proposal-design/preview?previewToken=${token}&page=about-us`);
}

/** Box of the element wrapping `marker`'s text that has the block width (var --block-width). */
async function widthBox(page: Page, marker: string) {
  const el = page.locator(".block-width-responsive", { hasText: marker }).last();
  await expect(el).toBeVisible();
  return (await el.boundingBox())!;
}

/** The content column the page's top-level blocks sit in. */
async function columnWidth(page: Page) {
  return page.evaluate(() => {
    const first = document.querySelector(".block-width-responsive")!;
    return first.parentElement!.getBoundingClientRect().width;
  });
}

const container = (id: string, layout: object | undefined, inner: object[]) => ({
  id, type: "container", rows: 1, cols: 1, gap: "md", columnWeights: [1], rowWeights: [1], cellAlign: "start",
  ...(layout ? { blockLayout: layout } : {}), cells: [[inner]],
});

test.describe("page layout inheritance (page → container → element)", () => {
  test("top-level elements take the page's width; an element's own width wins", async ({ page }) => {
    await renderPreview(page, [text("a", "PL-TOP"), text("b", "PL-OWN", { widthDesktop: "full" })], { widthDesktop: "narrow", align: "center" });
    const col = await columnWidth(page);
    expect((await widthBox(page, "PL-TOP")).width / col).toBeCloseTo(0.65, 1); // page: narrow = 65%
    expect((await widthBox(page, "PL-OWN")).width / col).toBeCloseTo(1, 1); // own: full
  });

  test("with no page layout, elements use the branding default (Normal, 80%)", async ({ page }) => {
    await renderPreview(page, [text("a", "PL-DEFAULT")]);
    expect((await widthBox(page, "PL-DEFAULT")).width / (await columnWidth(page))).toBeCloseTo(0.8, 1);
  });

  test("elements inside a container fill it, so widths never compound", async ({ page }) => {
    await renderPreview(page, [container("c", { widthDesktop: "normal" }, [text("t", "PL-NESTED")])]);
    const col = await columnWidth(page);
    const nested = await widthBox(page, "PL-NESTED");
    // the container is 80% of the page; the text fills the container (about 80% of the page), not 64%
    expect(nested.width / col).toBeGreaterThan(0.7);
    expect(nested.width / col).toBeLessThan(0.82);
  });

  test("alignment follows the nearest parent that sets one, then the page", async ({ page }) => {
    // Container aligned right; the text inside has its own narrow width and no alignment of its own.
    await renderPreview(page, [container("c", { widthDesktop: "full", align: "right" }, [text("t", "PL-ALIGN", { widthDesktop: "compact" })])], { align: "left" });
    const box = await widthBox(page, "PL-ALIGN");
    const cell = await page.locator(".portal-container-grid > div").first().boundingBox();
    expect(box.x + box.width).toBeGreaterThan(cell!.x + cell!.width - 8); // pushed to the container's right edge
    // Same text in a container with no alignment: inherits the page's left.
    await renderPreview(page, [container("c", { widthDesktop: "full" }, [text("t", "PL-ALIGN", { widthDesktop: "compact" })])], { align: "left" });
    const left = await widthBox(page, "PL-ALIGN");
    const cell2 = await page.locator(".portal-container-grid > div").first().boundingBox();
    expect(left.x).toBeLessThan(cell2!.x + 8);
  });

  test("the inspector sets the page layout and shows 'Inherit (…)' on its elements", async ({ page }) => {
    await page.goto(DESIGNER);
    await expect(page.getByRole("group", { name: "Page layout" })).toBeVisible();
    await page.getByLabel("Page desktop width").selectOption({ label: "Narrow" });
    await page.getByLabel("Page horizontal align").selectOption({ label: "Left" });
    // Add a block: it inherits the page's Narrow / Left.
    await page.getByRole("button", { name: /^Outline/ }).click();
    await page.getByRole("button", { name: "+ Text", exact: true }).click();
    await expect(page.getByLabel("Desktop width").locator("option:checked")).toHaveText("Inherit (Narrow)");
    await expect(page.getByLabel("Horizontal align").first().locator("option:checked")).toHaveText("Inherit (Left)");
    // Overriding then choosing Inherit again clears the override.
    await page.getByLabel("Desktop width").selectOption({ label: "Wide" });
    await expect(page.getByLabel("Desktop width")).toHaveValue("wide");
    await page.getByLabel("Desktop width").selectOption({ label: "Inherit (Narrow)" });
    await expect(page.getByLabel("Desktop width")).toHaveValue("");
    // Nothing was saved: leave without saving.
  });
});

/** The branding default panel opacity currently saved (percent). Tests read it rather than assume 100. */
async function brandingPanelOpacity(page: Page): Promise<number> {
  const content = await (await page.request.get("/api/portal-content")).json();
  return content.content.layoutSettings?.panelOpacity ?? 100;
}

// The alpha of the first stop of the panel's glass gradient: 0.12 at 100% opacity, scaled down with it.
async function panelAlpha(page: Page, marker: string) {
  const panel = page.locator("[data-element-panel]", { hasText: marker }).first();
  await expect(panel).toBeVisible();
  const bg = await panel.evaluate((el) => getComputedStyle(el).backgroundImage);
  return parseFloat(bg.match(/rgba\(255, 255, 255, ([0-9.]+)\)/)![1]!);
}

test.describe("element panels", () => {
  test("a panel's opacity: its own value, else the branding default", async ({ page }) => {
    const defaultPct = await brandingPanelOpacity(page);
    await renderPreview(page, [text("a", "PN-DEFAULT", { panel: true }), text("b", "PN-HALF", { panel: true, panelOpacity: 50 }), text("c", "PN-NONE", { panel: true, panelOpacity: 0 })]);
    expect(await panelAlpha(page, "PN-DEFAULT")).toBeCloseTo((0.12 * defaultPct) / 100, 2); // the branding default (100% = standard glass)
    expect(await panelAlpha(page, "PN-HALF")).toBeCloseTo(0.06, 2);
    expect(await panelAlpha(page, "PN-NONE")).toBeCloseTo(0, 2);
    // No panel means no panel element at all.
    await renderPreview(page, [text("a", "PN-PLAIN")]);
    await expect(page.locator("[data-element-panel]")).toHaveCount(0);
  });

  test("changing the branding default changes every panel that doesn't override it", async ({ page }) => {
    const original = (await (await page.request.get("/api/portal-content")).json()).content.layoutSettings;
    const set = (panelOpacity: number | undefined) =>
      page.request.patch("/api/portal-content", { data: { content: { layoutSettings: { ...original, panelOpacity } } } });
    try {
      expect((await set(50)).ok()).toBe(true);
      await renderPreview(page, [text("a", "PN-DEFAULT", { panel: true }), text("b", "PN-OWN", { panel: true, panelOpacity: 100 })]);
      expect(await panelAlpha(page, "PN-DEFAULT")).toBeCloseTo(0.06, 2); // follows the new default (50%)
      expect(await panelAlpha(page, "PN-OWN")).toBeCloseTo(0.12, 2); // override still wins
    } finally {
      // Put the branding settings back exactly as they were.
      const content = (await (await page.request.get("/api/portal-content")).json()).content;
      await page.request.patch("/api/portal-content", { data: { content: { layoutSettings: original } } });
      expect(content.layoutSettings.panelOpacity).toBe(50);
    }
    const restored = (await (await page.request.get("/api/portal-content")).json()).content.layoutSettings;
    expect(restored.panelOpacity).toEqual(original.panelOpacity);
  });

  test("the inspector offers a panel toggle and an opacity slider that defaults to the branding value", async ({ page }) => {
    await page.goto(DESIGNER);
    await page.getByRole("button", { name: /^Outline/ }).click();
    await page.getByRole("button", { name: "+ Text", exact: true }).click();
    await expect(page.getByLabel("Panel opacity")).toHaveCount(0); // hidden until the panel is on
    await page.getByLabel("Panel behind this element").check();
    await expect(page.getByLabel("Panel opacity")).toBeVisible();
    await expect(page.getByText(/\(default\)/)).toBeVisible();
    await page.getByLabel("Panel opacity").fill("40");
    await expect(page.getByText("40%")).toBeVisible();
    await page.getByRole("button", { name: /^Use default \(/ }).click();
    await expect(page.getByText(/\(default\)/)).toBeVisible();
  });
});

test("Configuration and Setup: renamed, no Fleet showcase, has the panel opacity default", async ({ page }) => {
  await page.goto(DESIGNER);
  await expect(page.getByRole("button", { name: "Global branding" })).toHaveCount(0);
  await page.getByRole("button", { name: "Configuration and Setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Portal assets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Layout widths" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Element panels" })).toBeVisible();
  await expect(page.getByLabel("Default panel opacity")).toBeVisible();
  await expect(page.getByText(/fleet showcase/i)).toHaveCount(0);
});

test("cell cards on a container get an opacity control that changes the cards", async ({ page }) => {
  const defaultPct = await brandingPanelOpacity(page);
  const cards = (extra: object = {}) => ({
    id: "cc", type: "container", rows: 1, cols: 2, gap: "md", columnWeights: [1, 1], rowWeights: [1], cellAlign: "stretch", cellCardStyle: true,
    blockLayout: { widthDesktop: "full", ...extra },
    cells: [[[text("a", "CC-ONE")], [text("b", "CC-TWO")]]],
  });
  const cardAlpha = async () => {
    const card = page.locator(".portal-container-grid > .portal-v2-glass").first();
    await expect(card).toBeVisible();
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundImage);
    return parseFloat(bg.match(/rgba\(255, 255, 255, ([0-9.]+)\)/)![1]!);
  };

  // Published render: the container's opacity override applies to its cell cards; no override = default.
  await renderPreview(page, [cards({ panelOpacity: 40 })]);
  expect(await cardAlpha()).toBeCloseTo(0.048, 2);
  await renderPreview(page, [cards()]);
  expect(await cardAlpha()).toBeCloseTo((0.12 * defaultPct) / 100, 2);

  // Designer: the slider is there for a container with cell cards even though 'Panel' is off.
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: [cards()] };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await page.getByRole("button", { name: /^Page code/i }).click();
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByText(/^Container \(1×2\)/).last().click();
  await page.getByRole("button", { name: /^Outline/ }).click();
  await expect(page.getByLabel("Panel behind this element")).not.toBeChecked();
  const slider = page.getByLabel("Panel and card opacity");
  await expect(slider).toBeVisible();
  expect(await cardAlpha()).toBeCloseTo((0.12 * defaultPct) / 100, 2);
  await slider.fill("40");
  await expect.poll(cardAlpha).toBeCloseTo(0.048, 2); // the cards on the canvas follow the slider
  // Ticking then unticking Panel must not throw away the cards' opacity.
  await page.getByLabel("Panel behind this element").check();
  await page.getByLabel("Panel behind this element").uncheck();
  await expect(slider).toHaveValue("40");
});
