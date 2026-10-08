import { expect, test, type Page } from "@playwright/test";

// A tall text column next to a short container — the layout where "Vertical align: Center" must
// centre the container in its column instead of pinning it to the top. Rendered through the real
// portal code via the designer's preview endpoint (short-lived preview rows; no saved page changes).
const MARKER = "VA-SHORT-MARKER";
const PARAGRAPH = "Aircraft ownership should be transparent, predictable, and genuinely enjoyable. ".repeat(6);

type VAlign = "top" | "center" | "bottom";

function buildRow(verticalAlign: VAlign) {
  return {
    id: "va-row",
    type: "row",
    preset: "equal-2",
    gap: "md",
    columnWeights: [1, 1],
    columns: [
      [{ id: "va-tall", type: "text", markdown: Array.from({ length: 10 }, () => PARAGRAPH).join("\n\n") }],
      [
        {
          id: "va-box",
          type: "container",
          rows: 1,
          cols: 1,
          gap: "md",
          columnWeights: [1],
          rowWeights: [1],
          width: "full",
          cellAlign: "start",
          blockLayout: { widthDesktop: "full", widthMobile: "full", align: "center", verticalAlign },
          cells: [[[{ id: "va-short", type: "text", markdown: MARKER }]]],
        },
      ],
    ],
  };
}

/** Where the short container's text sits inside its (stretched) column. */
async function measure(page: Page) {
  await expect(page.locator("[data-row-layout], .portal-container-grid").getByText(MARKER).first()).toBeVisible();
  return page.evaluate((marker) => {
    const el = Array.from(document.querySelectorAll("[data-row-layout] *, .portal-container-grid *")).find((e) => e.children.length === 0 && e.textContent?.trim() === marker)!;
    // The OUTERMOST grid cell around the marker: the tall column (the designer turns rows into containers).
    let col: Element | null = null;
    for (let n: Element | null = el; n; n = n.parentElement) if (n.matches("[data-row-layout] > div, .portal-container-grid > div")) col = n;
    const t = el.getBoundingClientRect();
    const c = col!.getBoundingClientRect();
    return { textTop: t.top, textBottom: t.bottom, textCenter: (t.top + t.bottom) / 2, colTop: c.top, colBottom: c.bottom, colCenter: (c.top + c.bottom) / 2, colHeight: c.height };
  }, MARKER);
}

function expectAligned(m: Awaited<ReturnType<typeof measure>>, v: VAlign) {
  expect(m.colHeight, "the column must be much taller than the container for this to mean anything").toBeGreaterThan(300);
  const quarter = m.colHeight * 0.25; // the designer's dashed placeholder box adds some offset, so compare against the column
  if (v === "top") expect(m.textTop - m.colTop).toBeLessThan(quarter);
  if (v === "center") {
    expect(Math.abs(m.textCenter - m.colCenter)).toBeLessThan(60);
    expect(m.textTop - m.colTop).toBeGreaterThan(quarter); // clearly not pinned to the top
    expect(m.colBottom - m.textBottom).toBeGreaterThan(quarter); // ...or the bottom
  }
  if (v === "bottom") expect(m.colBottom - m.textBottom).toBeLessThan(quarter);
}

/** The published/preview render path. */
async function previewWith(page: Page, verticalAlign: VAlign) {
  const content = await (await page.request.get("/api/portal-content")).json();
  const about = (content.content.experienceTemplates as Array<{ sectionType: string }>).find((t) => t.sectionType === "about_us")!;
  const res = await page.request.post("/api/portal-content/designer-preview", {
    data: { sections: [{ ...about, visible: true, contentBlocks: { pageBlocks: [buildRow(verticalAlign)] } }], activePageSlug: "about-us" },
  });
  const { token } = await res.json();
  await page.goto(`/aircraft-management/proposal-design/preview?previewToken=${token}&page=about-us`);
  return measure(page);
}

/** The designer canvas render path (what you see while editing). Loaded through the Page code panel; never saved. */
async function canvasWith(page: Page, verticalAlign: VAlign) {
  const code = page.getByLabel("Page code JSON");
  if (!(await code.isVisible())) await page.getByRole("button", { name: /^Page code/i }).click();
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { ...(record.contentBlocks ?? {}), pageBlocks: [buildRow(verticalAlign)] };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  return measure(page);
}

test.use({ viewport: { width: 1440, height: 1000 } });

test("Vertical align on a container (preview): top pins to the top, center centres it, bottom pins to the bottom", async ({ page }) => {
  for (const v of ["top", "center", "bottom"] as const) expectAligned(await previewWith(page, v), v);
});

test("Vertical align on a container (designer canvas): same behaviour while editing", async ({ page }) => {
  await page.goto("/aircraft-management/proposal-design");
  for (const v of ["top", "center", "bottom"] as const) expectAligned(await canvasWith(page, v), v);
});
