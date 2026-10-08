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

test("a newly added block is explicitly Normal width and centered", async ({ page, context }) => {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByRole("button", { name: "+ Text", exact: true }).click();

  // The inspector shows Normal / Center for the new block...
  await expect(page.getByLabel("Desktop width")).toHaveValue("normal");
  await expect(page.getByLabel("Horizontal align").first()).toHaveValue("center");

  // ...and the block itself carries that layout (not just a render-time fallback). Preview sends the
  // unsaved designer state, so nothing is written to the master pages.
  const previewRequest = page.waitForRequest((r) => r.url().endsWith("/api/portal-content/designer-preview") && r.method() === "POST");
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: /^preview$/i }).first().click();
  const body = JSON.parse((await previewRequest).postData() ?? "{}");
  await (await popup).close();
  const fresh = findBlocks(body.sections).filter((b) => b.type === "text" && b.markdown === "" && b.blockLayout);
  expect(fresh.length).toBeGreaterThan(0);
  expect(fresh[0]!.blockLayout).toEqual({ widthDesktop: "normal", widthMobile: "normal", align: "center" });
});

test("there is no Block vs flight button, but existing Block vs flight blocks still show up", async ({ page }) => {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Outline/ }).click();
  await expect(page.getByRole("button", { name: "+ Text", exact: true })).toBeVisible(); // the add row is rendered
  // Not in the top palette, and not in the Outline "Add block" row.
  await expect(page.getByRole("button", { name: /Block vs flight/i })).toHaveCount(0);

  // The Aircraft Charter page has one; it is still listed and editable.
  await page.getByRole("navigation", { name: "Designer pages" }).getByRole("button", { name: "Aircraft Charter", exact: true }).click();
  const existing = page.getByText(/^Block vs flight/).first();
  await expect(existing).toBeVisible();
  await existing.click();
  await expect(page.getByLabel("Desktop width")).toBeVisible();
});
