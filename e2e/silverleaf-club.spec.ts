import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Silverleaf Air Golf Club proposal. Uses the staging fixture proposal created by
 *   npx tsx scripts/seed-silverleaf.ts --proposal "Silverleaf Air Golf Club (design review)"
 * Anything a test changes it restores in a finally block.
 */
const FIXTURE_NAME = "Silverleaf Air Golf Club (design review)";
const SILVERLEAF_SLUGS = [
  "silverleaf-welcome",
  "silverleaf-membership",
  "silverleaf-access",
  "silverleaf-fleet",
  "silverleaf-billing",
  "silverleaf-program",
  "silverleaf-structure",
  "silverleaf-pro-forma",
  "silverleaf-launch",
  "prismjet-economics",
];

type ProposalRow = { id: string; proposalName: string; clientPortal?: { slug: string } | null };

async function listProposals(request: APIRequestContext): Promise<ProposalRow[]> {
  const res = await request.get("/api/proposals");
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function fixture(request: APIRequestContext) {
  const row = (await listProposals(request)).find((p) => p.proposalName === FIXTURE_NAME);
  if (!row?.clientPortal?.slug) {
    throw new Error(
      `Fixture proposal "${FIXTURE_NAME}" not found on staging. Create it with: npx tsx scripts/seed-silverleaf.ts --proposal "${FIXTURE_NAME}"`
    );
  }
  return { id: row.id, slug: row.clientPortal.slug };
}

const draftUrl = (slug: string, page: string) => `/${slug}/experience/${page}?draft=1`;

test("welcome page shows the club terms from the club model", async ({ page, request }) => {
  const { slug } = await fixture(request);
  await page.goto(draftUrl(slug, "silverleaf-welcome"));
  await expect(page.getByRole("heading", { name: "Silverleaf Air Golf Club" })).toBeVisible();
  // Counts up to the final value; the final value is what must read correctly.
  await expect(page.getByText("$500,000", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$15,000", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$9,000", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("50 hrs", { exact: true }).first()).toBeVisible();
});

test("nav shows only the Silverleaf pages, with PrismJet branding", async ({ page, request }) => {
  const { slug } = await fixture(request);
  await page.goto(draftUrl(slug, "silverleaf-welcome"));
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByText("Your membership")).toBeVisible();
  await expect(nav.getByText("How access works")).toBeVisible();
  await expect(nav.getByText("Charter", { exact: true })).toHaveCount(0);
  await expect(nav.getByText("Maintenance", { exact: true })).toHaveCount(0);
});

test("member cost calculator bills overage past the included hours", async ({ page, request }) => {
  const { slug } = await fixture(request);
  await page.goto(draftUrl(slug, "silverleaf-membership"));
  await expect(page.getByText("$630,000").first()).toBeVisible();
  await page.getByLabel("Hours flown per year").fill("68");
  await expect(page.getByText("$699,300").first()).toBeVisible();
  await expect(page.getByText(/18 hours past your 50 included/)).toBeVisible();
  await page.getByLabel("Hours flown per year").fill("40");
  await expect(page.getByText(/hours past your/)).toHaveCount(0);
});

test("pro forma recalculates when the viewer changes member growth, and resets", async ({ page, request }) => {
  const { slug } = await fixture(request);
  await page.goto(draftUrl(slug, "silverleaf-pro-forma"));
  const members = page.getByText("Members, month 60").locator("xpath=following-sibling::p");
  // Default ramp fills the 4-aircraft fleet and never over-sells it.
  await expect(members).toHaveText("40");
  await page.getByLabel("New members per year").fill("0");
  await expect(members).toHaveText("10");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(members).toHaveText("40");
});

test("structure comparison lets the viewer switch structure and fleet size", async ({ page, request }) => {
  const { slug } = await fixture(request);
  await page.goto(draftUrl(slug, "silverleaf-structure"));
  await expect(page.getByRole("radio", { name: /Licensing/ })).toBeVisible();
  await page.getByRole("radio", { name: /Joint venture/ }).click();
  await expect(page.getByRole("radio", { name: /Joint venture/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "1 aircraft" }).click();
  await expect(page.getByRole("radio", { name: "1 aircraft" })).toHaveAttribute("aria-checked", "true");
});

test("PrismJet economics are shown while that page is visible", async ({ page, request }) => {
  const { slug } = await fixture(request);
  await page.goto(draftUrl(slug, "prismjet-economics"));
  await expect(page.getByText("Operator economics")).toBeVisible();
  await expect(page.getByText("Interim lift rate")).toBeVisible();
});

test("hiding the PrismJet page removes its figures and narrative from the page data", async ({ request }) => {
  const { id, slug } = await fixture(request);
  const proposal = await (await request.get(`/api/proposals/${id}`)).json();
  const section = (proposal.sections as Array<{ id: string; pageSlug: string | null; visible: boolean }>).find(
    (s) => s.pageSlug === "prismjet-economics"
  );
  expect(section, "PrismJet economics section exists on the fixture").toBeTruthy();
  const wasVisible = section!.visible;
  const setVisible = (visible: boolean) =>
    request.patch(`/api/proposals/${id}/sections`, { data: { sections: [{ id: section!.id, visible }] } });

  const probes = [
    "Charter share",
    "30% to PrismJet",
    "Why the operating share",
    "operatingShareAnnual",
    "annualCash",
    "Operator economics",
    "Interim lift",
  ];
  try {
    expect((await setVisible(true)).ok()).toBeTruthy();
    const shown = await (await request.get(draftUrl(slug, "silverleaf-welcome"))).text();
    expect(shown).toContain("operatingShareAnnual");

    expect((await setVisible(false)).ok()).toBeTruthy();
    const hidden = await (await request.get(draftUrl(slug, "silverleaf-welcome"))).text();
    for (const probe of probes) expect(hidden, `hidden page leaks "${probe}"`).not.toContain(probe);
    // The owner's own view is still delivered.
    expect(hidden).toContain("silverleafAnnualCash");
  } finally {
    await setVisible(wasVisible);
  }
});

test("designer shows live club figures and the club model editor loads", async ({ page, request }) => {
  const { id } = await fixture(request);
  await page.goto(`/aircraft-management/proposals/${id}/design`);
  // Generic pages are listed first (hidden for this usage type); pick a Silverleaf page.
  await page.getByText("Your membership", { exact: true }).click();
  await expect(page.getByText("What a year of flying costs")).toBeVisible();
  await expect(page.getByText("$630,000").first()).toBeVisible();

  await page.goto(`/aircraft-management/proposals/${id}/club`);
  await expect(page.getByRole("heading", { name: "Club model" })).toBeVisible();
  await expect(page.getByText("Members per aircraft")).toBeVisible();
  await expect(page.getByText("$1,377,174")).toBeVisible();
});

test("other usage types never get the Silverleaf pages", async ({ request }) => {
  const rows = await listProposals(request);
  const other = rows.find((p) => p.proposalName !== FIXTURE_NAME && p.clientPortal?.slug);
  test.skip(!other, "No non-Silverleaf proposal on staging to check");
  // Opening a proposal adds any new master pages to it, exactly as for real users.
  await request.get(`/aircraft-management/proposals/${other!.id}`);
  const proposal = await (await request.get(`/api/proposals/${other!.id}`)).json();
  const club = (proposal.sections as Array<{ pageSlug: string | null; visible: boolean }>).filter(
    (s) => s.pageSlug && SILVERLEAF_SLUGS.includes(s.pageSlug)
  );
  for (const s of club) expect(s.visible, `${s.pageSlug} must be hidden for non-Silverleaf proposals`).toBe(false);
});
