import { expect, test, type APIRequestContext } from "@playwright/test";

// Creates throwaway line items + an aircraft on a staging proposal; removes them all at the end.
const STAMP = Date.now();
const SATCOM = `E2E Satcom ${STAMP}`;
const NAV = `E2E Nav database ${STAMP}`;
const PROPOSAL_ID = "4d128f39-a9f2-4ed9-9c46-a0faf4180af5";

const state: { satcomKey?: string; navKey?: string; typeId?: string; typeStatus?: string; aircraftId?: string } = {};

async function cleanup(request: APIRequestContext) {
  if (state.aircraftId) await request.delete(`/api/proposals/${PROPOSAL_ID}/aircraft/${state.aircraftId}`);
  const rows: Array<{ key: string; label: string }> = (await (await request.get("/api/data/line-items")).json()).rows;
  for (const r of rows.filter((r) => r.label.startsWith("E2E "))) await request.delete(`/api/data/line-items/${r.key}`);
}

test.describe.serial("line items catalog", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: "e2e/.auth/user.json" });
    await cleanup(page.request);
    await page.close();
  });

  test("Line Items tab: built-ins are listed and calculated lines are described", async ({ page }) => {
    await page.goto("/data-warehouse/data?tab=line-items");
    const list = page.getByRole("navigation", { name: "Line items" });
    await expect(list.getByRole("button", { name: /^Hangar/ })).toBeVisible();
    await list.getByRole("button", { name: /^Hangar/ }).click();
    await expect(page.getByText(/Calculated: FBO hangar rate/)).toBeVisible();
    await list.getByRole("button", { name: /^Wi-Fi|^In-Flight Wi-Fi/ }).click();
    await expect(page.getByText(/Value set per aircraft type/)).toBeVisible();
    // Built-ins can't be deleted.
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  });

  test("create a custom hourly and a custom annual line item", async ({ page }) => {
    await page.goto("/data-warehouse/data?tab=line-items");
    for (const [name, section] of [[SATCOM, "Variable Costs"], [NAV, "Fixed Ownership Costs"]] as const) {
      await page.getByRole("button", { name: "+ Add line item" }).click();
      await page.getByLabel("Name *").fill(name);
      await page.getByRole("radiogroup", { name: "Section" }).getByText(section, { exact: true }).click();
      await page.getByRole("button", { name: "Create" }).click();
      await expect(page.getByText(/^Created\./)).toBeVisible();
    }
    const rows: Array<{ key: string; label: string; section: string; kind: string; appliesTo?: string }> = (await (await page.request.get("/api/data/line-items")).json()).rows;
    const satcom = rows.find((r) => r.label === SATCOM)!;
    const nav = rows.find((r) => r.label === NAV)!;
    expect(satcom).toMatchObject({ section: "variable", kind: "hourly", appliesTo: "both" });
    expect(nav).toMatchObject({ section: "fixed", kind: "annual" });
    expect(satcom.key).toMatch(/^li_e2e_satcom_/);
    state.satcomKey = satcom.key;
    state.navKey = nav.key;
  });

  test("aircraft type: set custom values on the expense tabs; they persist", async ({ page }) => {
    const types: Array<{ id: string; status: string; displayName: string }> = (await (await page.request.get("/api/data/aircraft?limit=500")).json()).rows;
    const type = types.find((t) => t.status === "published")!;
    state.typeId = type.id;
    state.typeStatus = type.status;
    const tabs = page.getByRole("navigation", { name: "Type sections" });

    // Hourly item → Variable Expenses; annual item → Annual Expenses. Edits persist across tabs until saved.
    await page.goto(`/data-warehouse/data?tab=aircraft&typeId=${type.id}&section=Variable%20Expenses`);
    await page.getByLabel(new RegExp(`^${SATCOM} \\(\\$/hr`)).fill("45");
    await tabs.getByRole("button", { name: "Annual Expenses", exact: true }).click();
    await page.getByLabel(new RegExp(`^${NAV} \\(\\$/yr`)).fill("8000");
    const saved = page.waitForResponse((r) => r.url().endsWith("/line-items") && r.request().method() === "PUT");
    // Publish (not "Save draft", which would flip a published type back to draft).
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    expect((await saved).ok()).toBe(true);
    const after = (await (await page.request.get("/api/data/aircraft?limit=500")).json()).rows.find((t: { id: string }) => t.id === type.id);
    expect(after.status).toBe("published");
    const values = (await (await page.request.get(`/api/data/aircraft/${type.id}/line-items`)).json()).values;
    expect(values[state.satcomKey!]).toBe(45);
    expect(values[state.navKey!]).toBe(8000);
  });

  test("adding that aircraft to a proposal seeds the values and the catalog; per-proposal edits stick", async ({ page }) => {
    const fbos: Array<{ airportIcao: string; fboName: string }> = (await (await page.request.get("/api/data/fbos?limit=500")).json()).rows;
    const fbo = fbos[0]!;
    const usage = (await (await page.request.get("/api/data/usage-types?limit=500")).json()).rows.find((u: { name: string }) => u.name === "Part 91/135 Home Base");
    const add = await page.request.post(`/api/proposals/${PROPOSAL_ID}/aircraft`, {
      data: { aircraftMasterId: state.typeId, proposedHomeBase: fbo.airportIcao, fboName: fbo.fboName, usageType: usage.name },
    });
    expect(add.status(), await add.text()).toBe(201);
    state.aircraftId = (await add.json()).aircraft.id;
    const category = `ac_${state.aircraftId}`;
    const read = async () => {
      const rows: Array<{ category: string; assumptionName: string; value: string }> = await (await page.request.get(`/api/proposals/${PROPOSAL_ID}/assumptions`)).json();
      return Object.fromEntries(rows.filter((r) => r.category === category).map((r) => [r.assumptionName, r.value]));
    };
    const seeded = await read();
    expect(Number(seeded[state.satcomKey!])).toBe(45);
    expect(Number(seeded[state.navKey!])).toBe(8000);
    const catalog = JSON.parse(seeded.proforma_line_catalog!) as Array<{ key: string; label: string; section: string }>;
    expect(catalog.find((c) => c.key === state.satcomKey)).toMatchObject({ label: SATCOM, section: "variable" });
    expect(catalog.find((c) => c.key === state.navKey)).toMatchObject({ label: NAV, section: "fixed" });

    // The usage type's settings were applied, including the new lines (included by default).
    const visibility = JSON.parse(seeded.proforma_line_visibility!);
    expect(visibility[`owner_${state.satcomKey}`]).toBe(true);
    expect(visibility[state.navKey!]).toBe(true);

    // Per-proposal override persists.
    const edit = await page.request.post(`/api/proposals/${PROPOSAL_ID}/assumptions`, {
      data: [{ category, assumptionName: state.navKey, value: "9500" }],
    });
    expect(edit.ok()).toBe(true);
    expect(Number((await read())[state.navKey!])).toBe(9500);
  });
});
