import { expect, test, type Page } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";
test.use({ viewport: { width: 1600, height: 1000 } });

async function loadBlocks(page: Page, markers: string[]) {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: markers.map((m, i) => ({ id: `s${i}`, type: "text", markdown: m })) };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: markers[0]! })).toBeVisible();
  // close the Page code panel so it doesn't overlap the inspector
  await page.getByRole("button", { name: /^Page code/i }).click();
}

const pageName = (page: Page) => page.getByText("Page name", { exact: true });
const blockSettings = (page: Page) => page.getByLabel("Desktop width", { exact: true });

test("right-clicking an element selects it and opens its menu", async ({ page }) => {
  await loadBlocks(page, ["SEL-AAA", "SEL-BBB"]);
  await expect(pageName(page)).toBeVisible(); // nothing selected: page settings
  await page.locator(".design-shell .portal-markdown", { hasText: "SEL-BBB" }).click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible(); // its context menu
  await expect(blockSettings(page)).toBeVisible(); // ...and it is selected: its settings are showing
  await expect(pageName(page)).toHaveCount(0);
  await expect(page.locator('.design-shell[data-selected="true"]', { hasText: "SEL-BBB" })).toHaveCount(1);
});

test("clicking (or right-clicking) the page background selects the page", async ({ page }) => {
  await loadBlocks(page, ["SEL-AAA", "SEL-BBB"]);
  const background = page.locator("[data-page-background]");

  await page.locator(".design-shell .portal-markdown", { hasText: "SEL-AAA" }).click();
  await expect(blockSettings(page)).toBeVisible();
  await background.click({ position: { x: 4, y: 4 } }); // empty margin, outside every block
  await expect(pageName(page)).toBeVisible();
  await expect(blockSettings(page)).toHaveCount(0);

  // Right-click on the background does the same.
  await page.locator(".design-shell .portal-markdown", { hasText: "SEL-AAA" }).click();
  await expect(blockSettings(page)).toBeVisible();
  await background.click({ position: { x: 4, y: 4 }, button: "right" });
  await expect(pageName(page)).toBeVisible();

  // Clicking a block still selects it (the background handler doesn't swallow it).
  await page.locator(".design-shell .portal-markdown", { hasText: "SEL-BBB" }).click();
  await expect(blockSettings(page)).toBeVisible();
});
