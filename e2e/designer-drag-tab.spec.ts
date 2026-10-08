import { expect, test, type Page } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";
test.use({ viewport: { width: 1500, height: 1000 } });

async function loadBlocks(page: Page, markers: string[]) {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: markers.map((m, i) => ({ id: `t${i}`, type: "text", markdown: m })) };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: markers[0]! })).toBeVisible();
}

/** Markers in on-screen top-to-bottom order. */
async function order(page: Page, markers: string[]) {
  const tops = await page.evaluate((ms) => ms.map((m) => {
    const el = Array.from(document.querySelectorAll(".design-shell .portal-markdown")).find((e) => e.textContent?.trim() === m)!;
    return { m, top: el.getBoundingClientRect().top };
  }), markers);
  return tops.sort((a, b) => a.top - b.top).map((t) => t.m);
}

test("each block has a drag tab on its top-left corner, not a bar down the left side", async ({ page }) => {
  await loadBlocks(page, ["DT-AAA", "DT-BBB"]);
  const shell = page.locator(".design-shell", { has: page.locator(".portal-markdown", { hasText: "DT-AAA" }) }).last();
  await shell.hover({ position: { x: 60, y: 10 } });
  const tab = shell.locator("> .design-shell-tab");
  await expect(tab).toBeVisible();
  const [s, t] = await Promise.all([shell.boundingBox(), tab.boundingBox()]);
  expect(Math.abs(t!.x - s!.x)).toBeLessThan(2); // left-aligned with the block's left edge
  expect(t!.y + t!.height).toBeLessThanOrEqual(s!.y + 2); // sitting on the top edge
  expect(t!.height).toBeLessThan(40); // a small tab, not a full-height bar
  await expect(tab).toContainText("Text");
  // No left padding reserved for a bar any more.
  expect(await shell.evaluate((e) => getComputedStyle(e).paddingLeft)).toBe("0px");
  // Hidden when the block isn't hovered or selected.
  await page.mouse.move(5, 5);
  await expect(tab).toHaveCSS("opacity", "0");
});

test("dragging a block's tab rearranges blocks", async ({ page }) => {
  const markers = ["DT-AAA", "DT-BBB", "DT-CCC"];
  await loadBlocks(page, markers);
  expect(await order(page, markers)).toEqual(markers);

  const first = page.locator(".design-shell", { has: page.locator(".portal-markdown", { hasText: "DT-AAA" }) }).last();
  await first.hover({ position: { x: 60, y: 10 } });
  const tab = first.locator("> .design-shell-tab");
  await expect(tab).toBeVisible();
  const from = (await tab.boundingBox())!;
  const lastBlock = (await page.locator(".design-shell", { has: page.locator(".portal-markdown", { hasText: "DT-CCC" }) }).last().boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 40, { steps: 5 });
  await page.mouse.move(lastBlock.x + 80, lastBlock.y + lastBlock.height - 4, { steps: 25 });
  await page.mouse.up();

  await expect.poll(() => order(page, markers)).not.toEqual(markers);
  const after = await order(page, markers);
  expect(after[after.length - 1]).toBe("DT-AAA"); // the dragged block moved below the others
});
