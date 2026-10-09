import { expect, test } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";

test("page settings show for the page, and give way to the block's settings once a block is selected", async ({ page }) => {
  await page.goto(DESIGNER);
  const pageName = page.getByText("Page name", { exact: true });
  const usageTypes = page.getByRole("link", { name: "Data Warehouse → Usage Types → Portal pages" });
  const blockSettings = page.getByLabel("Desktop width", { exact: true });

  // Page selected, no block: page settings (name, usage types) are shown, block settings are not.
  await expect(pageName).toBeVisible();
  await expect(usageTypes).toBeVisible();
  await expect(blockSettings).toHaveCount(0);

  // Select a specific element: page settings go away, the block's settings take over.
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByRole("button", { name: "+ Text", exact: true }).click();
  await expect(blockSettings).toBeVisible();
  await expect(pageName).toHaveCount(0);
  await expect(usageTypes).toHaveCount(0);

  // "← Page settings" returns to the page.
  await page.getByRole("button", { name: "← Page settings" }).click();
  await expect(pageName).toBeVisible();
  await expect(blockSettings).toHaveCount(0);

  // Clicking the page in the list also returns to its settings.
  await page.getByRole("button", { name: "+ Text", exact: true }).click();
  await expect(blockSettings).toBeVisible();
  await expect(pageName).toHaveCount(0);
  await page.getByRole("navigation", { name: "Designer pages" }).getByRole("button", { name: "Welcome", exact: true }).click();
  await expect(pageName).toBeVisible();
});
