import { expect, test } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";

test("designer: usage types are read-only here, set in the warehouse", async ({ page }) => {
  await page.goto(DESIGNER);
  await expect(page.getByRole("link", { name: "Data Warehouse → Usage Types → Portal pages" })).toBeVisible();
  // No per-usage-type checkboxes in the inspector any more.
  for (const name of ["Part 91", "Part 91/135 Home Base", "Part 91/135 Floating"]) {
    await expect(page.getByRole("checkbox", { name, exact: true })).toHaveCount(0);
  }
});

test("designer: Visible / Hidden filter, and reorder is off while filtered", async ({ page }) => {
  await page.goto(DESIGNER);
  const pages = page.getByRole("navigation", { name: "Designer pages" });
  const show = page.getByRole("radiogroup", { name: "Show pages" });
  await expect(pages.getByRole("button", { name: "Drag to reorder" }).first()).toBeVisible();

  await show.getByRole("radio", { name: "Visible" }).click();
  const visibleBoxes = pages.getByRole("checkbox");
  for (const box of await visibleBoxes.all()) await expect(box).toBeChecked();
  await expect(pages.getByRole("button", { name: "Drag to reorder" })).toHaveCount(0);
  await expect(pages.getByRole("button", { name: "Clear filters to reorder" }).first()).toBeVisible();

  await show.getByRole("radio", { name: "Hidden" }).click();
  for (const box of await pages.getByRole("checkbox").all()) await expect(box).not.toBeChecked();

  await show.getByRole("radio", { name: "All" }).click();
  await expect(pages.getByRole("button", { name: "Drag to reorder" }).first()).toBeVisible();
});

test("designer: a page excluded in the warehouse drops out of that usage type's filter", async ({ page }) => {
  const types: Array<{ id: string; name: string }> = (await (await page.request.get("/api/data/usage-types?limit=500")).json()).rows;
  const part91 = types.find((t) => t.name === "Part 91")!;
  const exclude = await page.request.patch(`/api/data/usage-types/${part91.id}/pages`, {
    data: { slug: "maintenance", applies: false },
  });
  expect(exclude.ok()).toBe(true);
  try {
    await page.goto(DESIGNER);
    const pages = page.getByRole("navigation", { name: "Designer pages" });
    await expect(pages.getByRole("button", { name: "Maintenance", exact: true })).toBeVisible();
    await page.getByLabel("Filter by usage type").selectOption({ label: "Part 91" });
    await expect(pages.getByRole("button", { name: "Maintenance", exact: true })).toHaveCount(0);
    await page.getByLabel("Filter by usage type").selectOption({ label: "Part 91/135 Home Base" });
    await expect(pages.getByRole("button", { name: "Maintenance", exact: true })).toBeVisible();
  } finally {
    const restore = await page.request.patch(`/api/data/usage-types/${part91.id}/pages`, {
      data: { slug: "maintenance", applies: true },
    });
    expect(restore.ok()).toBe(true);
  }
});
