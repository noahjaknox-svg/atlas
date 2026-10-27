import { expect, test } from "@playwright/test";

/**
 * The global designer lists master pages without database ids, and all custom pages share the
 * section type "custom_page". They used to be unselectable (and an edit would have hit every one).
 * Read-only: nothing is saved. Uses the Silverleaf master pages (scripts/seed-silverleaf.ts).
 */
const DESIGNER = "/aircraft-management/proposal-design";

const pageButton = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("navigation", { name: "Designer pages" }).getByRole("button", { name, exact: true });

test("each Silverleaf master page can be selected and shows its own content", async ({ page }) => {
  await page.goto(DESIGNER);

  await pageButton(page, "Your membership").click();
  await expect(page.getByText("Three things you pay")).toBeVisible();

  await pageButton(page, "How access works").click();
  await expect(page.getByText("Rules written before anyone needs them")).toBeVisible();
  await expect(page.getByText("Three things you pay")).toHaveCount(0);

  await pageButton(page, "Ownership structure").click();
  await expect(page.getByText("How much to put at risk")).toBeVisible();
});

test("selection still works after a fresh load (ids are rebuilt, not lost)", async ({ page }) => {
  await page.goto(DESIGNER);
  await page.reload();
  await pageButton(page, "The aircraft").click();
  await expect(page.getByText("One type, ten members per aircraft")).toBeVisible();
  await pageButton(page, "Launch & risk").click();
  await expect(page.getByText("From first member to first aircraft")).toBeVisible();
});

test("the Club economics block is in the block palette", async ({ page }) => {
  await page.goto(DESIGNER);
  await expect(page.getByRole("button", { name: "Club economics", exact: true }).first()).toBeVisible();
});
