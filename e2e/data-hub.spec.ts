import { expect, test } from "@playwright/test";

// Tab label → something only that tab renders.
const TABS: Array<{ label: string; tab: string; marker: (p: import("@playwright/test").Page) => import("@playwright/test").Locator }> = [
  { label: "Aircraft types", tab: "aircraft", marker: (p) => p.getByPlaceholder(/search types/i) },
  { label: "Tails", tab: "tails", marker: (p) => p.getByPlaceholder(/search tails/i) },
  { label: "Airports", tab: "airports", marker: (p) => p.getByPlaceholder(/icao, name, or city/i) },
  { label: "FBOs", tab: "fbos", marker: (p) => p.getByPlaceholder(/search fbo/i) },
  { label: "Usage Types", tab: "usage-types", marker: (p) => p.getByPlaceholder(/search usage type/i) },
  { label: "General and Company", tab: "general", marker: (p) => p.getByRole("navigation", { name: "General and Company sections" }) },
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
  // The five workbenches + General and Company all use the list-sidebar layout.
  for (const t of TABS.slice(0, 6)) {
    await nav.getByRole("button", { name: t.label, exact: true }).click();
    await expect(t.marker(page)).toBeVisible();
    const box = await page.locator("aside.data-hub-sidebar:visible").first().boundingBox();
    widths[t.label] = Math.round(box!.width);
  }
  expect(new Set(Object.values(widths)).size, JSON.stringify(widths)).toBe(1);
});

test("General and Company has a section sidebar that switches the form", async ({ page }) => {
  await page.goto("/data-warehouse/data?tab=general");
  const sections = page.getByRole("navigation", { name: "General and Company sections" });
  const cases: Array<[string, RegExp]> = [
    ["Financing template", /default down payment/i],
    ["Crew org policy", /crew \/sync|ops-tunable/i],
    ["Core fees & fuel", /us average fuel cost/i],
  ];
  for (const [label, content] of cases) {
    await sections.getByRole("button", { name: label }).click();
    await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
    await expect(page.getByText(content).first()).toBeVisible();
    await expect(sections.getByRole("button", { name: label })).toHaveAttribute("aria-current", "page");
  }
  // Deep link restores the section.
  await page.goto("/data-warehouse/data?tab=general&section=financing");
  await expect(page.getByRole("heading", { level: 2, name: "Financing template" })).toBeVisible();
});
