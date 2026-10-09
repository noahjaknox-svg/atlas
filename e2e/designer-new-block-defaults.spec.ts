import { expect, test } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";

type AnyBlock = { type?: string; markdown?: string; blockLayout?: Record<string, string> } & Record<string, unknown>;

function findBlocks(node: unknown, out: AnyBlock[] = []): AnyBlock[] {
  if (Array.isArray(node)) node.forEach((n) => findBlocks(n, out));
  else if (node && typeof node === "object") {
    const o = node as AnyBlock;
    if (typeof o.type === "string") out.push(o);
    Object.values(o).forEach((v) => findBlocks(v, out));
  }
  return out;
}

test("a newly added block inherits the page layout instead of saving its own", async ({ page, context }) => {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByRole("button", { name: "+ Text", exact: true }).click();

  // The inspector shows 'Inherit (…)' for width and alignment, i.e. nothing is set on the block.
  await expect(page.getByLabel("Desktop width", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Desktop width", { exact: true }).locator("option:checked")).toHaveText(/^Inherit \(/);
  await expect(page.getByLabel("Horizontal align").first()).toHaveValue("");
  await expect(page.getByLabel("Horizontal align").first().locator("option:checked")).toHaveText(/^Inherit \(/);

  // ...and the block really has no layout of its own. Preview sends the unsaved designer state, so
  // nothing is written to the master pages.
  const previewRequest = page.waitForRequest((r) => r.url().endsWith("/api/portal-content/designer-preview") && r.method() === "POST");
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: /^preview$/i }).first().click();
  const body = JSON.parse((await previewRequest).postData() ?? "{}");
  await (await popup).close();
  const fresh = findBlocks(body.sections).filter((b) => b.type === "text" && b.markdown === "");
  expect(fresh.length).toBeGreaterThan(0);
  expect(fresh[0]!.blockLayout).toBeUndefined();
});

test("there is no Block vs flight button, but existing Block vs flight blocks still show up", async ({ page }) => {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Outline/ }).click();
  await expect(page.getByRole("button", { name: "+ Text", exact: true })).toBeVisible(); // the add row is rendered
  // Not in the top palette, and not in the Outline "Add block" row.
  await expect(page.getByRole("button", { name: /Block vs flight/i })).toHaveCount(0);

  // The Aircraft Charter page has one; it is still listed and editable.
  await page.getByRole("navigation", { name: "Designer pages" }).getByRole("button", { name: "Aircraft Charter", exact: true }).click();
  // The canvas drag tab is also labelled with the block name; the Outline row is the last match.
  const existing = page.getByText(/^Block vs flight/).last();
  await expect(existing).toBeVisible();
  await existing.click();
  await expect(page.getByLabel("Desktop width", { exact: true })).toBeVisible();
});
