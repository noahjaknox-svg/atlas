import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1000 } });

async function selectedFrameWidth(page: Page, widthDesktop: "full" | "normal" | "narrow", type: "container" | "row") {
  await page.goto("/aircraft-management/proposal-design");
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  const inner = [{ id: "sw-text", type: "text", markdown: "SW-MARKER" }];
  const block =
    type === "container"
      ? { id: "sw-box", type: "container", rows: 1, cols: 1, gap: "md", columnWeights: [1], rowWeights: [1], width: "full", cellAlign: "start", blockLayout: { widthDesktop, widthMobile: "full", align: "center" }, cells: [[inner]] }
      : { id: "sw-box", type: "row", preset: "equal-2", gap: "md", columnWeights: [1, 1], blockLayout: { widthDesktop, widthMobile: "full", align: "center" }, columns: [inner, [{ id: "sw-b", type: "text", markdown: "SW-OTHER" }]] };
  record.contentBlocks = { pageBlocks: [block] };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: "SW-MARKER" })).toBeVisible();

  // Select the block itself (the Outline row), then measure its selection frame.
  await page.getByRole("button", { name: /^Outline/ }).click();
  // (The designer shows a row as a 1x2 container. The canvas drag tab shares the label, so take the Outline row: the last match.)
  await page.getByText(type === "container" ? /^Container \(1×1\)/ : /^Container \(1×2\)/).last().click();
  const frame = page.locator('.design-shell[data-selected="true"]').first();
  await expect(frame).toBeVisible();
  const box = (await frame.boundingBox())!;
  const canvas = (await page.locator(".design-shell").first().evaluate((el) => {
    // the canvas content column: the frame's outermost ancestor that is the full-width page container
    let n: HTMLElement | null = el as HTMLElement;
    let widest = el.getBoundingClientRect().width;
    for (; n; n = n.parentElement) widest = Math.max(widest, n.getBoundingClientRect().width);
    return widest;
  }));
  return { frame: box.width, canvas };
}

for (const type of ["container", "row"] as const) {
  test(`a selected ${type} set to Normal width is framed at Normal width, not the whole page`, async ({ page }) => {
    const full = await selectedFrameWidth(page, "full", type);
    const normal = await selectedFrameWidth(page, "normal", type);
    const narrow = await selectedFrameWidth(page, "narrow", type);
    // Presets: full 100%, normal 80%, narrow 65% of the same content column.
    expect(normal.frame / full.frame).toBeGreaterThan(0.74);
    expect(normal.frame / full.frame).toBeLessThan(0.86);
    expect(narrow.frame / full.frame).toBeGreaterThan(0.6);
    expect(narrow.frame / full.frame).toBeLessThan(0.7);
    expect(normal.frame).toBeLessThan(full.frame - 100);
  });
}
