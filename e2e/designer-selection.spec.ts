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

test("you can click around: each left-click selects what you click, elements and background alike", async ({ page }) => {
  await loadBlocks(page, ["ST-AAA", "ST-BBB"]);
  const selected = (marker: string) => page.locator('.design-shell[data-selected="true"]', { hasText: marker });
  const block = (marker: string) => page.locator(".design-shell .portal-markdown", { hasText: marker });
  const background = page.locator("[data-page-background]");

  await expect(pageName(page)).toBeVisible();
  await block("ST-AAA").click();
  await expect(selected("ST-AAA")).toHaveCount(1);
  await expect(blockSettings(page)).toBeVisible();

  // Straight to another element, no trip through the background.
  await block("ST-BBB").click();
  await expect(selected("ST-BBB")).toHaveCount(1);
  await expect(selected("ST-AAA")).toHaveCount(0);

  await block("ST-AAA").click();
  await expect(selected("ST-AAA")).toHaveCount(1);

  // Right-click selects too (and still opens its menu).
  await block("ST-BBB").click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(selected("ST-BBB")).toHaveCount(1);

  // The background selects the page, and clicking an element works again right after.
  await background.click({ position: { x: 4, y: 4 } });
  await expect(pageName(page)).toBeVisible();
  await block("ST-AAA").click();
  await expect(selected("ST-AAA")).toHaveCount(1);
  await background.click({ position: { x: 4, y: 4 } });
  await expect(pageName(page)).toBeVisible();
});

test("left-click selects the innermost element, and 'Select parent' walks back out", async ({ page }) => {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  const nested = {
    id: "outer", type: "container", rows: 1, cols: 2, gap: "md", columnWeights: [1, 1], rowWeights: [1], cellAlign: "stretch", blockLayout: { widthDesktop: "full" },
    cells: [[
      [{ id: "inner", type: "container", rows: 1, cols: 1, gap: "md", columnWeights: [1], rowWeights: [1], cellAlign: "stretch", cells: [[[{ id: "leaf", type: "text", markdown: "NS-LEAF" }]]] }],
      [{ id: "other", type: "text", markdown: "NS-OTHER" }],
    ]],
  };
  record.contentBlocks = { pageBlocks: [nested] };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await page.getByRole("button", { name: /^Page code/i }).click();

  const leafShell = page.locator('.design-shell[data-selected="true"]', { has: page.locator(".portal-markdown", { hasText: "NS-LEAF" }) });
  const selectedShells = page.locator('.design-shell[data-selected="true"]');
  const crumbs = page.getByRole("navigation", { name: "Selection" });
  const parentLink = crumbs.getByRole("button").last(); // the nearest ancestor (the last crumb before the element)
  const backToPage = crumbs.getByRole("button", { name: "Page settings" });

  // From the page settings a left-click on an element two containers deep selects THAT element.
  await page.locator(".design-shell .portal-markdown", { hasText: "NS-LEAF" }).click();
  await expect(selectedShells).toHaveCount(1);
  await expect(leafShell.locator(".portal-container-grid")).toHaveCount(0); // the text itself, not a container around it
  await expect(page.getByText("Markdown text")).toBeVisible();

  // The same for a plain element in the neighbouring cell.
  await backToPage.click();
  await page.locator(".design-shell .portal-markdown", { hasText: "NS-OTHER" }).click();
  await expect(page.locator('.design-shell[data-selected="true"] .portal-markdown', { hasText: "NS-OTHER" })).toHaveCount(1);
  await expect(page.locator('.design-shell[data-selected="true"] .portal-container-grid')).toHaveCount(0);

  // 'Select parent' walks out one level at a time: leaf → inner container → outer container → none.
  await backToPage.click();
  await page.locator(".design-shell .portal-markdown", { hasText: "NS-LEAF" }).click();
  await expect(parentLink).toHaveText(/^Container/);
  await parentLink.click();
  await expect(page.getByLabel("Gap between cells")).toBeVisible(); // a container's settings
  await expect(page.locator('.design-shell[data-selected="true"] .portal-markdown', { hasText: "NS-OTHER" })).toHaveCount(0); // the inner one, not the outer
  await parentLink.click();
  await expect(page.locator('.design-shell[data-selected="true"] .portal-markdown', { hasText: "NS-OTHER" })).toHaveCount(1); // the outer container holds both cells
  await expect(crumbs.getByRole("button")).toHaveCount(1); // top level: only "Page settings" above it
});
