import { expect, test, type Page } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";
test.use({ viewport: { width: 1600, height: 1000 } });

async function loadBlocks(page: Page, blocks: object[], marker: string) {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: blocks };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: marker })).toBeVisible();
  await page.getByRole("button", { name: /^Page code/i }).click();
}

const BLOCKS = [
  { id: "outer", type: "container", rows: 1, cols: 1, gap: "md", columnWeights: [1], rowWeights: [1], blockLayout: { widthDesktop: "full" },
    cells: [[[{ id: "leaf", type: "text", markdown: "IL-LEAF" }]]] },
  { id: "sp", type: "spacer", size: "md" },
];

test("settings are grouped into collapsible sections, and the breadcrumb shows where you are", async ({ page }) => {
  await loadBlocks(page, BLOCKS, "IL-LEAF");
  await page.locator(".design-shell .portal-markdown", { hasText: "IL-LEAF" }).click();

  const crumbs = page.getByRole("navigation", { name: "Selection" });
  await expect(crumbs).toContainText("Page settings");
  await expect(crumbs).toContainText("Container");
  await expect(crumbs.locator('[aria-current="location"]')).toHaveText("Text");

  // Size & position, Spacing & visibility and Panel are separate groups.
  for (const name of ["Size & position", "Spacing & visibility", "Panel"]) {
    await expect(page.getByRole("group", { name })).toBeVisible();
  }
  const size = page.getByRole("group", { name: "Size & position" });
  await expect(size.getByLabel("Desktop width", { exact: true })).toBeVisible();

  // Collapsing a section hides its controls, and the choice is remembered for the next selection.
  await size.getByRole("button", { name: /Size & position/ }).click();
  await expect(page.getByLabel("Desktop width", { exact: true })).toHaveCount(0);
  await page.locator("[data-page-background]").click({ position: { x: 4, y: 4 } });
  await page.locator(".design-shell .portal-markdown", { hasText: "IL-LEAF" }).click();
  await expect(page.getByLabel("Desktop width", { exact: true })).toHaveCount(0);
  await page.getByRole("group", { name: "Size & position" }).getByRole("button").first().click(); // reopen
  await expect(page.getByLabel("Desktop width", { exact: true })).toBeVisible();

  // The vertical-align control says when it applies.
  await expect(page.getByText("Takes effect when this is the only element in its container cell.")).toBeVisible();
});

test("an overridden setting offers Reset back to inherited; a spacer has no Panel", async ({ page }) => {
  await loadBlocks(page, BLOCKS, "IL-LEAF");
  await page.locator(".design-shell .portal-markdown", { hasText: "IL-LEAF" }).click();

  const width = page.getByLabel("Desktop width", { exact: true });
  await expect(page.getByRole("button", { name: "Reset Desktop width to inherited" })).toHaveCount(0);
  await width.selectOption({ label: "Wide" });
  await expect(page.getByRole("button", { name: "Reset Desktop width to inherited" })).toBeVisible();
  await page.getByRole("button", { name: "Reset Desktop width to inherited" }).click();
  await expect(width).toHaveValue("");
  await expect(page.getByRole("button", { name: "Reset Desktop width to inherited" })).toHaveCount(0);

  // A spacer is only space: it has no Panel group. Select it from the Outline.
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByText("Spacer", { exact: true }).last().click();
  await expect(page.getByText("Spacer size", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Size & position" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Panel" })).toHaveCount(0);
});
