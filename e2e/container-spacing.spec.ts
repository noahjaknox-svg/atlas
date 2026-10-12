import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1100 } });

const DESIGNER = "/aircraft-management/proposal-design";
const text = (id: string, markdown: string) => ({ id, type: "text", markdown });

const container = (cols: number, rows: number, cells: object[][][], extra: object = {}) => ({
  id: "box", type: "container", rows, cols, gap: "md",
  columnWeights: Array(cols).fill(1), rowWeights: Array(rows).fill(1),
  blockLayout: { widthDesktop: "full" }, cells, ...extra,
});

/** Render through the real portal code via the designer's preview endpoint. */
async function renderPreview(page: Page, pageBlocks: object[]) {
  const content = await (await page.request.get("/api/portal-content")).json();
  const about = (content.content.experienceTemplates as Array<{ sectionType: string }>).find((t) => t.sectionType === "about_us")!;
  const res = await page.request.post("/api/portal-content/designer-preview", {
    data: { sections: [{ ...about, visible: true, contentBlocks: { pageBlocks } }], activePageSlug: "about-us" },
  });
  const { token } = await res.json();
  await page.goto(`/aircraft-management/proposal-design/preview?previewToken=${token}&page=about-us`);
  await expect(page.locator(".portal-container-grid").first()).toBeVisible();
}

type Box = { x: number; y: number; width: number; height: number };
async function boxOf(page: Page, marker: string): Promise<Box> {
  const el = page.locator(".portal-container-grid").getByText(marker, { exact: true }).first();
  await expect(el).toBeVisible();
  return (await el.boundingBox())!;
}
async function gridBox(page: Page): Promise<Box> {
  return (await page.locator(".portal-container-grid").first().boundingBox())!;
}

// ---------- horizontal: three cells across ----------
const across = (extra: object) => container(3, 1, [[[text("a", "CS-A")], [text("b", "CS-B")], [text("c", "CS-C")]]], extra);
async function xs(page: Page) {
  const g = await gridBox(page);
  const [a, b, c] = [await boxOf(page, "CS-A"), await boxOf(page, "CS-B"), await boxOf(page, "CS-C")];
  return { g, a, b, c, left: a.x - g.x, right: g.x + g.width - (c.x + c.width), gap1: b.x - (a.x + a.width), gap2: c.x - (b.x + b.width) };
}

test.describe("horizontal spacing (columns)", () => {
  test("stretch: equal thirds", async ({ page }) => {
    await renderPreview(page, [across({})]);
    const { a, b, c, g } = await xs(page);
    // Cell boxes hold the text, so compare the tracks via the cells' left edges: ~ thirds of the grid.
    expect((b.x - a.x) / g.width).toBeGreaterThan(0.3);
    expect((c.x - b.x) / g.width).toBeGreaterThan(0.3);
  });

  test("start / center / end pack the cells to the left / middle / right", async ({ page }) => {
    await renderPreview(page, [across({ spaceColumns: "start" })]);
    let m = await xs(page);
    expect(m.left).toBeLessThan(4);
    expect(m.right).toBeGreaterThan(m.g.width * 0.5);

    await renderPreview(page, [across({ spaceColumns: "end" })]);
    m = await xs(page);
    expect(m.right).toBeLessThan(4);
    expect(m.left).toBeGreaterThan(m.g.width * 0.5);

    await renderPreview(page, [across({ spaceColumns: "center" })]);
    m = await xs(page);
    expect(Math.abs(m.left - m.right)).toBeLessThan(4);
    expect(m.left).toBeGreaterThan(m.g.width * 0.2);
  });

  test("between: first and last touch the edges; around: half-gaps; evenly: equal gaps everywhere", async ({ page }) => {
    await renderPreview(page, [across({ spaceColumns: "between" })]);
    let m = await xs(page);
    expect(m.left).toBeLessThan(4);
    expect(m.right).toBeLessThan(4);
    expect(Math.abs(m.gap1 - m.gap2)).toBeLessThan(4);
    expect(m.gap1).toBeGreaterThan(m.g.width * 0.25);

    await renderPreview(page, [across({ spaceColumns: "around" })]);
    m = await xs(page);
    // The edge gap is half of the free-space share; the inner gap is that share plus the container's own 20px gap.
    expect(Math.abs(m.left * 2 + 20 - m.gap1)).toBeLessThan(6);
    expect(Math.abs(m.right * 2 + 20 - m.gap1)).toBeLessThan(6);

    await renderPreview(page, [across({ spaceColumns: "evenly" })]);
    m = await xs(page);
    // Every free-space share is equal; the inner gaps additionally contain the container's 20px gap.
    expect(Math.abs(m.left + 20 - m.gap1)).toBeLessThan(6);
    expect(Math.abs(m.gap1 - m.gap2)).toBeLessThan(4);
    expect(Math.abs(m.right - m.left)).toBeLessThan(4);
  });
});

// ---------- vertical: three stacked rows in a tall container ----------
const down = (extra: object) => container(1, 3, [[[text("a", "CS-A")]], [[text("b", "CS-B")]], [[text("c", "CS-C")]]], { minHeight: "lg", ...extra });
async function ys(page: Page) {
  const g = await gridBox(page);
  const [a, b, c] = [await boxOf(page, "CS-A"), await boxOf(page, "CS-B"), await boxOf(page, "CS-C")];
  return { g, a, b, c, top: a.y - g.y, bottom: g.y + g.height - (c.y + c.height), gap1: b.y - (a.y + a.height), gap2: c.y - (b.y + b.height) };
}

test.describe("vertical spacing (rows)", () => {
  test("the container is taller than its content when a height is set", async ({ page }) => {
    await renderPreview(page, [down({ spaceRows: "start" })]);
    expect((await gridBox(page)).height).toBeGreaterThanOrEqual(559);
  });

  test("start / center / end pack the rows to the top / middle / bottom", async ({ page }) => {
    await renderPreview(page, [down({ spaceRows: "start" })]);
    let m = await ys(page);
    expect(m.top).toBeLessThan(4);
    expect(m.bottom).toBeGreaterThan(m.g.height * 0.5);

    await renderPreview(page, [down({ spaceRows: "end" })]);
    m = await ys(page);
    expect(m.bottom).toBeLessThan(4);
    expect(m.top).toBeGreaterThan(m.g.height * 0.5);

    await renderPreview(page, [down({ spaceRows: "center" })]);
    m = await ys(page);
    expect(Math.abs(m.top - m.bottom)).toBeLessThan(4);
  });

  test("between: top, middle and bottom as far apart as possible; around; evenly", async ({ page }) => {
    await renderPreview(page, [down({ spaceRows: "between" })]);
    let m = await ys(page);
    expect(m.top).toBeLessThan(4);
    expect(m.bottom).toBeLessThan(4);
    expect(Math.abs(m.gap1 - m.gap2)).toBeLessThan(4);

    await renderPreview(page, [down({ spaceRows: "around" })]);
    m = await ys(page);
    expect(Math.abs(m.top * 2 + 20 - m.gap1)).toBeLessThan(6);

    await renderPreview(page, [down({ spaceRows: "evenly" })]);
    m = await ys(page);
    expect(Math.abs(m.top + 20 - m.gap1)).toBeLessThan(6);
    expect(Math.abs(m.bottom - m.top)).toBeLessThan(4);
  });

  test("stretch (default): the rows share the height in equal thirds", async ({ page }) => {
    await renderPreview(page, [down({})]);
    const { g, a, b, c } = await ys(page);
    // Row tracks are thirds of the container: each cell starts about a third further down.
    expect((b.y - a.y) / g.height).toBeGreaterThan(0.28);
    expect((c.y - b.y) / g.height).toBeGreaterThan(0.28);
  });

  test("a container beside taller content can still be packed to the bottom (nested fill)", async ({ page }) => {
    const tall = text("tall", Array.from({ length: 14 }, () => "Aircraft ownership should be transparent and predictable.").join("\n\n"));
    const inner = container(1, 1, [[[text("inner", "CS-INNER")]]], { spaceRows: "end", blockLayout: { widthDesktop: "full" } });
    await renderPreview(page, [container(2, 1, [[[tall], [inner]]], { alignCells: "stretch" })]);
    const grids = page.locator(".portal-container-grid");
    const outer = (await grids.first().boundingBox())!;
    const marker = (await page.locator(".portal-container-grid").getByText("CS-INNER", { exact: true }).boundingBox())!;
    expect(outer.height).toBeGreaterThan(300);
    expect(outer.y + outer.height - (marker.y + marker.height)).toBeLessThan(30); // sitting at the bottom of the tall column
  });
});

// ---------- aligning cells inside their row ----------
const cellsRow = (alignCells?: string) =>
  container(2, 1, [[[text("s", "CS-SHORT")], [text("t", Array.from({ length: 9 }, () => "A taller cell with plenty of text to make the row taller.").join("\n\n"))]]], alignCells ? { alignCells } : {});

test.describe("align cells within their row", () => {
  test("top / middle / bottom place the shorter cell; stretch makes the cells equal height", async ({ page }) => {
    const shortCell = async () => {
      const g = await gridBox(page);
      const cell = (await page.locator(".portal-container-grid > div").first().boundingBox())!;
      const text = await boxOf(page, "CS-SHORT");
      return { g, cell, text, fromTop: text.y - g.y, fromBottom: g.y + g.height - (text.y + text.height) };
    };
    await renderPreview(page, [cellsRow()]);
    let m = await shortCell();
    expect(m.cell.height).toBeGreaterThan(m.g.height - 4); // default stretch: the cell fills the row

    await renderPreview(page, [cellsRow("start")]);
    m = await shortCell();
    expect(m.cell.height).toBeLessThan(m.g.height * 0.5);
    expect(m.fromTop).toBeLessThan(4);

    await renderPreview(page, [cellsRow("end")]);
    m = await shortCell();
    expect(m.fromBottom).toBeLessThan(4);

    await renderPreview(page, [cellsRow("center")]);
    m = await shortCell();
    expect(Math.abs(m.fromTop - m.fromBottom)).toBeLessThan(6);
  });
});

// ---------- gap + the inspector ----------
test("gap options change the space between cells", async ({ page }) => {
  const gaps: Record<string, number> = {};
  for (const gap of ["none", "sm", "md", "lg", "xl"]) {
    await renderPreview(page, [container(2, 1, [[[text("a", "CS-A")], [text("b", "CS-B")]]], { gap })]);
    const cells = page.locator(".portal-container-grid > div");
    const [c0, c1] = [(await cells.nth(0).boundingBox())!, (await cells.nth(1).boundingBox())!];
    gaps[gap] = Math.round(c1.x - (c0.x + c0.width));
  }
  expect(gaps).toEqual({ none: 0, sm: 12, md: 20, lg: 32, xl: 48 });
});

test("the inspector offers every spacing option and applies them to the canvas", async ({ page }) => {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: [down({})] };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await page.getByRole("button", { name: /^Page code/i }).click();
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByText(/^Container \(3×1\)/).last().click();
  await page.getByRole("button", { name: /^Outline/ }).click();

  const group = page.getByRole("group", { name: "Cell spacing" });
  await expect(group).toBeVisible();
  const options = async (label: string) => group.getByLabel(label, { exact: true }).locator("option").allTextContents();
  expect(await options("Gap between cells")).toEqual(["None", "Small", "Medium", "Large", "Extra large"]);
  expect((await options("Horizontal spacing")).length).toBe(7);
  expect((await options("Vertical spacing")).length).toBe(7);
  expect(await options("Align cells within their row")).toEqual(["Stretch to equal height", "Top", "Middle", "Bottom"]);
  expect((await options("Container height")).length).toBe(5);

  // The row heights editor only applies when the rows fill the height ("Fill the height").
  await expect(page.getByText("Row heights (relative weights)")).toBeVisible();
  await group.getByLabel("Vertical spacing", { exact: true }).selectOption("between");
  await expect(page.getByText("Row heights (relative weights)")).toHaveCount(0);

  // ...and the canvas follows: first row at the top, last row at the bottom of the 560px-tall container.
  const a = page.locator(".portal-container-grid").getByText("CS-A", { exact: true }).first();
  const c = page.locator(".portal-container-grid").getByText("CS-C", { exact: true }).first();
  await expect.poll(async () => {
    const [grid, ab, cb] = [(await page.locator(".portal-container-grid").first().boundingBox())!, (await a.boundingBox())!, (await c.boundingBox())!];
    return { top: Math.round(ab.y - grid.y), bottom: Math.round(grid.y + grid.height - (cb.y + cb.height)) };
  }).toMatchObject({ top: expect.any(Number) });
  const grid = (await page.locator(".portal-container-grid").first().boundingBox())!;
  const [ab, cb] = [(await a.boundingBox())!, (await c.boundingBox())!];
  expect(cb.y + cb.height - (ab.y)).toBeGreaterThan(grid.height * 0.8); // spread out, not stacked at the top
});

test("designer canvas: a container beside taller content packs to the bottom too", async ({ page }) => {
  const tall = text("tall", Array.from({ length: 14 }, () => "Aircraft ownership should be transparent and predictable.").join("\n\n"));
  const inner = container(1, 1, [[[text("inner", "CS-INNER")]]], { spaceRows: "end" });
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: [container(2, 1, [[[tall], [inner]]])] };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await page.getByRole("button", { name: /^Page code/i }).click();
  await page.getByRole("button", { name: /^Guides:/ }).click(); // guides off: measure the real layout
  const grids = page.locator("[data-page-background] .portal-container-grid");
  await expect(grids.first()).toBeVisible();
  const outer = (await grids.first().boundingBox())!;
  const marker = (await grids.getByText("CS-INNER", { exact: true }).boundingBox())!;
  expect(outer.height).toBeGreaterThan(300);
  // The designer adds a small drop zone under the last block in a cell, so allow for it (failure was ~500px).
  expect(outer.y + outer.height - (marker.y + marker.height)).toBeLessThan(80);
  await page.evaluate(() => window.localStorage.removeItem("atlas.designer.showGuides"));
});
