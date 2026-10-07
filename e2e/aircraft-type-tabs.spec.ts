import { expect, test, type Page } from "@playwright/test";

const TABS = ["General", "Performance", "Crew", "Annual Expenses", "Variable Expenses", "Revenue", "Marketplace", "AFM"];

// Something only that tab renders.
const MARKERS: Record<string, (p: Page) => ReturnType<Page["getByText"]>> = {
  General: (p) => p.getByText("Aircraft Cost ($)").first(),
  Performance: (p) => p.getByText("Fuel Gallons Per Hour").first(),
  Crew: (p) => p.getByText("Max annual flight hours by pilot count").first(),
  "Annual Expenses": (p) => p.getByText("From elsewhere (not entered twice)").first(),
  "Variable Expenses": (p) => p.getByText("Parts Program ($/hr)").first(),
  Revenue: (p) => p.getByText("Charter Hourly Rate").first(),
  Marketplace: (p) => p.getByText("Empty-leg hourly rate ($)").first(),
  AFM: (p) => p.getByText(/AFM performance grids|Upload|Save this type first/i).first(),
};

async function publishedType(page: Page) {
  const rows: Array<{ id: string; status: string; displayName: string }> = (await (await page.request.get("/api/data/aircraft?limit=500")).json()).rows;
  return rows.find((t) => t.status === "published")!;
}

test("aircraft type editor has the 8 tabs in order, each with its own content", async ({ page }) => {
  const type = await publishedType(page);
  await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}`);
  const tabs = page.getByRole("navigation", { name: "Type sections" });
  await expect(tabs.getByRole("button")).toHaveText(TABS);
  for (const name of TABS) {
    await tabs.getByRole("button", { name, exact: true }).click();
    await expect(MARKERS[name]!(page)).toBeVisible();
  }
});

test("no field is lost or duplicated: every aircraft field appears on exactly one tab", async ({ page }) => {
  const type = await publishedType(page);
  await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}`);
  const tabs = page.getByRole("navigation", { name: "Type sections" });
  const seen: string[] = [];
  for (const name of TABS.filter((t) => t !== "AFM")) {
    await tabs.getByRole("button", { name, exact: true }).click();
    const labels = await page.locator("main label[for], label[for]").evaluateAll((els) => els.map((e) => (e as HTMLLabelElement).htmlFor));
    seen.push(...labels.filter((id) => id && !id.startsWith("li_")));
  }
  const dupes = seen.filter((id, i) => seen.indexOf(id) !== i);
  expect(dupes).toEqual([]);
  for (const key of ["averageCost", "fuelGallonsPerHour", "picSalary", "maxUsage3Pilots", "wifiAnnual", "partsProgram", "charterHourlyRate", "emptyLegHourlyRate"]) {
    expect(seen, key).toContain(key);
  }
});

test("Annual Expenses shows each line's single home with a source badge", async ({ page }) => {
  const type = await publishedType(page);
  await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}&section=Annual%20Expenses`);
  const list = page.getByRole("list", { name: "Annual Expenses sources" });
  await expect(list.locator('[data-line="hangar"]')).toContainText("FBO");
  await expect(list.locator('[data-line="crew"]')).toContainText("Calculated");
  for (const key of ["management_fee", "maintenance_management_fee", "insurance", "registration"]) {
    await expect(list.locator(`[data-line="${key}"]`)).toContainText("Company default");
  }
  await expect(list.locator('[data-line="management_fee"]')).toContainText(/Company default: \$[\d,]+/);
  // Values that belong to the type are entered once, in the grid above.
  await expect(page.getByLabel(/^In-Flight Wi-Fi|Wi-Fi \(annual\)/i).first()).toBeVisible();
  await expect(list.locator('[data-line="wifi"]')).toHaveCount(0);
});

test("old section links land on the right tab", async ({ page }) => {
  const type = await publishedType(page);
  const cases: Array<[string, string]> = [
    ["Line%20items", "From elsewhere (not entered twice)"],
    ["Utilization", "Max annual flight hours by pilot count"],
    ["Empty%20Legs", "Empty-leg hourly rate ($)"],
    ["Finances", "Charter Hourly Rate"],
  ];
  for (const [section, marker] of cases) {
    await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}&section=${section}`);
    await expect(page.getByText(marker).first()).toBeVisible();
  }
});

test("Charter empty-leg aircraft profiles are read-only and point to Marketplace", async ({ page }) => {
  await page.goto("/charter/empty-legs/aircraft-profiles");
  await expect(page.getByText(/read-only summary/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit pricing/ })).toHaveCount(0);
  const link = page.getByRole("link", { name: "Edit in Marketplace" }).first();
  await expect(link).toHaveAttribute("href", /section=Marketplace/);
});

test.describe.serial("cost overrides on an aircraft type", () => {
  const PROPOSAL_ID = "4d128f39-a9f2-4ed9-9c46-a0faf4180af5";
  const state: { typeId?: string; aircraftIds: string[] } = { aircraftIds: [] };

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: "e2e/.auth/user.json" });
    for (const id of state.aircraftIds) await page.request.delete(`/api/proposals/${PROPOSAL_ID}/aircraft/${id}`);
    if (state.typeId) {
      // Always send saveAs=publish: a bare PATCH would flip the type back to draft.
      await page.request.patch(`/api/data/aircraft/${state.typeId}`, { data: { saveAs: "publish", costOverrides: {} } });
    }
    await page.close();
  });

  async function addAircraft(page: Page, typeId: string): Promise<Record<string, string>> {
    const fbos: Array<{ airportIcao: string; fboName: string }> = (await (await page.request.get("/api/data/fbos?limit=500")).json()).rows;
    const fbo = fbos[0]!;
    const add = await page.request.post(`/api/proposals/${PROPOSAL_ID}/aircraft`, {
      data: { aircraftMasterId: typeId, proposedHomeBase: fbo.airportIcao, fboName: fbo.fboName, usageType: "Part 91/135 Home Base" },
    });
    expect(add.status(), await add.text()).toBe(201);
    const id = (await add.json()).aircraft.id as string;
    state.aircraftIds.push(id);
    const rows: Array<{ category: string; assumptionName: string; value: string }> = await (await page.request.get(`/api/proposals/${PROPOSAL_ID}/assumptions`)).json();
    return Object.fromEntries(rows.filter((r) => r.category === `ac_${id}`).map((r) => [r.assumptionName, r.value]));
  }

  test("an insurance override saves, seeds a new aircraft, and clearing it falls back to the company default", async ({ page }) => {
    const type = await publishedType(page);
    state.typeId = type.id;
    const company = (await (await page.request.get("/api/data/aircraft/defaults-preview")).json()).defaults as Record<string, string>;

    await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}&section=Annual%20Expenses`);
    await page.getByLabel("Insurance override for this aircraft type").selectOption("percent_hull");
    await page.getByLabel("Insurance percent override").fill("1.75");
    await page.getByLabel("Management Fee override", { exact: true }).fill("151000");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect.poll(async () => (await (await page.request.get(`/api/data/aircraft/${type.id}`)).json()).costOverrides).toMatchObject({
      insurance_mode: "percent_hull",
      insurance_premium_percent: "1.75",
      management_fee: "151000",
    });
    expect((await (await page.request.get(`/api/data/aircraft/${type.id}`)).json()).status).toBe("published");

    const withOverride = await addAircraft(page, type.id);
    expect(withOverride.insurance_mode).toBe("percent_hull");
    expect(Number(withOverride.insurance_premium_percent)).toBe(1.75);
    expect(Number(withOverride.management_fee)).toBe(151000);
    // Untouched lines still inherit the company default.
    if (company.maintenance_management_fee) {
      expect(Number(withOverride.maintenance_management_fee)).toBe(Number(company.maintenance_management_fee));
    }

    // Reload the editor: the override is shown, then clear it.
    await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}&section=Annual%20Expenses`);
    await expect(page.getByLabel("Insurance percent override")).toHaveValue("1.75");
    await page.getByLabel("Insurance override for this aircraft type").selectOption("");
    await page.getByLabel("Management Fee override", { exact: true }).fill("");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect.poll(async () => (await (await page.request.get(`/api/data/aircraft/${type.id}`)).json()).costOverrides).toEqual({});

    const inherited = await addAircraft(page, type.id);
    expect(Number(inherited.management_fee)).toBe(Number(company.management_fee));
    expect(inherited.insurance_mode).toBe(company.insurance_mode);
  });
});
