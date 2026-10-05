import { expect, test, type Page } from "@playwright/test";

// Creates its own throwaway usage type and deletes it at the end, so it's re-runnable.
const NAME = `E2E usage type ${Date.now()}`;

async function openType(page: Page) {
  await page.goto("/data-warehouse/data?tab=usage-types");
  await page.getByRole("navigation", { name: "Usage types" }).getByRole("button", { name: NAME }).click();
  await expect(page.getByRole("heading", { level: 2, name: NAME })).toBeVisible();
}

test.describe.serial("usage type configuration", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: "e2e/.auth/user.json" });
    const res = await page.request.get("/api/data/usage-types?limit=500");
    const rows: Array<{ id: string; name: string }> = (await res.json()).rows ?? [];
    for (const r of rows.filter((r) => r.name.startsWith("E2E usage type"))) {
      await page.request.delete(`/api/data/usage-types/${r.id}`);
    }
    await page.close();
  });

  test("create a type with Charter enabled — the checkbox saves and survives a reload", async ({ page }) => {
    await page.goto("/data-warehouse/data?tab=usage-types");
    await page.getByRole("button", { name: "+ Add usage type" }).click();
    await page.getByLabel("Name *").fill(NAME);
    await page.getByLabel(/Charter enabled/).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/^Saved\./)).toBeVisible();

    await openType(page);
    await expect(page.getByLabel(/Charter enabled/)).toBeChecked();
    await expect(page.getByLabel(/Show revenue section/)).toBeChecked();
  });

  test("per-line Include / Show client checkboxes save and survive a reload", async ({ page }) => {
    await openType(page);
    await page.getByRole("button", { name: "Pro forma lines" }).click();
    const fet = page.getByLabel(/^Include Revenue FET fuel tax refund$/i);
    const insInclude = page.getByLabel("Include Fixed Ownership Costs Insurance (Hull & Liability)");
    const insShow = page.getByLabel("Show client Fixed Ownership Costs Insurance (Hull & Liability)");
    await expect(fet).toBeChecked();
    await fet.uncheck();
    await insInclude.check(); // excluded by default
    await insShow.uncheck();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/^Saved\./)).toBeVisible();

    await openType(page);
    await page.getByRole("button", { name: "Pro forma lines" }).click();
    await expect(fet).not.toBeChecked();
    await expect(insInclude).toBeChecked();
    await expect(insShow).not.toBeChecked();
    // Show client can't be on for a line that isn't included.
    await expect(page.getByLabel(/^Show client Revenue FET fuel tax refund$/i)).toBeDisabled();
  });

  test("Portal pages: excluding a page writes the master page's usage types, and can be undone", async ({ page }) => {
    await openType(page);
    await page.getByRole("button", { name: "Portal pages" }).click();
    const list = page.getByRole("list", { name: "Portal pages" });
    const first = list.getByRole("checkbox").first();
    await expect(first).toBeChecked();
    const label = await first.getAttribute("aria-label");

    const saved = page.waitForResponse((r) => r.url().endsWith("/pages") && r.request().method() === "PATCH");
    await first.uncheck();
    expect((await saved).ok()).toBe(true);
    await expect(list.getByLabel(label!)).not.toBeChecked();
    await page.reload();
    await page.getByRole("navigation", { name: "Usage types" }).getByRole("button", { name: NAME }).click();
    await page.getByRole("button", { name: "Portal pages" }).click();
    await expect(page.getByRole("list", { name: "Portal pages" }).getByLabel(label!)).not.toBeChecked();

    // Restore so the master pages are left as they were.
    const restored = page.waitForResponse((r) => r.url().endsWith("/pages") && r.request().method() === "PATCH");
    await page.getByRole("list", { name: "Portal pages" }).getByLabel(label!).check();
    expect((await restored).ok()).toBe(true);
    await expect(page.getByRole("list", { name: "Portal pages" }).getByLabel(label!)).toBeChecked();
  });
});
