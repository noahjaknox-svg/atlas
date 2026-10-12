import { expect, test, type Page } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";
test.use({ viewport: { width: 1600, height: 1000 } });

async function loadContainer(page: Page) {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = {
    pageBlocks: [{ id: "g", type: "container", rows: 1, cols: 2, gap: "md", columnWeights: [1, 1], rowWeights: [1], blockLayout: { widthDesktop: "normal" }, cells: [[[{ id: "a", type: "text", markdown: "GD-ONE" }], [{ id: "b", type: "text", markdown: "GD-TWO" }]]] }],
  };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await page.getByRole("button", { name: /^Page code/i }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: "GD-ONE" })).toBeVisible();
}

const dashedBoxes = (page: Page) => page.locator("[data-design-viewport] [class*='border-dashed']");

test("Guides toggle hides the dashed outlines and the page shows as published", async ({ page }) => {
  await loadContainer(page);
  const toggle = page.getByRole("button", { name: /^Guides:/ });
  await expect(toggle).toHaveText("Guides: on");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(await dashedBoxes(page).count()).toBeGreaterThan(0);

  await toggle.click();
  await expect(toggle).toHaveText("Guides: off");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(dashedBoxes(page)).toHaveCount(0);
  // No faint grey fill left behind either.
  expect(await page.locator("[data-design-viewport] [class*='bg-white/[0.04]']").count()).toBe(0);
  // The content is still there and selectable: the selection frame and drag tab are not "guides".
  await page.locator(".design-shell .portal-markdown", { hasText: "GD-TWO" }).click();
  await expect(page.locator('.design-shell[data-selected="true"]')).toHaveCount(1);
  await expect(page.getByLabel("Desktop width", { exact: true })).toBeVisible();

  // Remembered across a reload, and turns back on.
  await page.reload();
  await expect(page.getByRole("button", { name: /^Guides:/ })).toHaveText("Guides: off");
  await page.getByRole("button", { name: /^Guides:/ }).click();
  await expect(page.getByRole("button", { name: /^Guides:/ })).toHaveText("Guides: on");
});

test.afterEach(async ({ page }) => {
  // Leave the browser profile the way we found it.
  await page.evaluate(() => window.localStorage.removeItem("atlas.designer.showGuides")).catch(() => {});
});
