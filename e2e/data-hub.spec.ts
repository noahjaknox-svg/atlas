import { expect, test } from "@playwright/test";

// Tab label → something only that tab renders.
const TABS: Array<{ label: string; tab: string; marker: (p: import("@playwright/test").Page) => import("@playwright/test").Locator }> = [
  { label: "Aircraft types", tab: "aircraft", marker: (p) => p.getByPlaceholder(/search types/i) },
  { label: "Tails", tab: "tails", marker: (p) => p.getByPlaceholder(/search tails/i) },
  { label: "Airports", tab: "airports", marker: (p) => p.getByPlaceholder(/icao, name, or city/i) },
  { label: "FBOs", tab: "fbos", marker: (p) => p.getByPlaceholder(/search fbo/i) },
  { label: "Usage Types", tab: "usage-types", marker: (p) => p.getByPlaceholder(/search usage type/i) },
  { label: "General and Company", tab: "general", marker: (p) => p.getByRole("heading", { name: "General and Company" }) },
  { label: "Insurance", tab: "insurance", marker: (p) => p.getByRole("heading", { name: "Insurance" }) },
  { label: "Registration & Taxes", tab: "registration-taxes", marker: (p) => p.getByRole("heading", { name: "Registration & Taxes" }) },
];

test("every Data Hub tab shows its own content when clicked, not just a new URL", async ({ page }) => {
  await page.goto("/data-warehouse/data?tab=aircraft");
  const nav = page.getByRole("navigation", { name: "Data warehouse sections" });
  // Visit each tab, then go back through them in reverse to cover the kept-mounted path.
  for (const t of [...TABS, ...TABS.slice().reverse()]) {
    await nav.getByRole("button", { name: t.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`tab=${t.tab}(&|$)`));
    await expect(t.marker(page)).toBeVisible();
  }
});

test("tab switches don't reload the page from the server", async ({ page }) => {
  await page.goto("/data-warehouse/data?tab=aircraft");
  await expect(page.getByPlaceholder(/search types/i)).toBeVisible();
  const documentRequests: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "document" || r.headers()["rsc"] === "1") documentRequests.push(r.url());
  });
  const nav = page.getByRole("navigation", { name: "Data warehouse sections" });
  for (const label of ["Tails", "Airports", "FBOs", "Aircraft types"]) {
    await nav.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(page.getByPlaceholder(/search types/i)).toBeVisible();
  expect(documentRequests).toEqual([]);
});

test("the list sidebar is the same width on every workbench tab", async ({ page }) => {
  await page.goto("/data-warehouse/data?tab=aircraft");
  const nav = page.getByRole("navigation", { name: "Data warehouse sections" });
  const widths: Record<string, number> = {};
  for (const t of TABS.slice(0, 5)) {
    await nav.getByRole("button", { name: t.label, exact: true }).click();
    await expect(t.marker(page)).toBeVisible();
    const box = await page.locator("aside.data-hub-sidebar:visible").first().boundingBox();
    widths[t.label] = Math.round(box!.width);
  }
  expect(new Set(Object.values(widths)).size, JSON.stringify(widths)).toBe(1);
});
