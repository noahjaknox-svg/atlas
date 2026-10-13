import { expect, test, type Page } from "@playwright/test";

const DESIGNER = "/aircraft-management/proposal-design";
test.use({ viewport: { width: 1600, height: 1000 } });

type Block = Record<string, unknown>;

async function loadPageBlocks(page: Page, blocks: Block[], firstMarker: string) {
  await page.goto(DESIGNER);
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  record.contentBlocks = { pageBlocks: blocks };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();
  await expect(page.locator(".design-shell .portal-markdown", { hasText: firstMarker })).toBeVisible();
  await page.getByRole("button", { name: /^Page code/i }).click(); // close so it doesn't cover the inspector
}

const text = (id: string, markdown: string): Block => ({ id, type: "text", markdown });
const marker = (page: Page, m: string) => page.locator(".design-shell .portal-markdown", { hasText: m });

test("dragging a block into a container that comes LATER keeps the block (it used to vanish)", async ({ page }) => {
  await loadPageBlocks(
    page,
    [
      text("a", "DND-MOVE-ME"),
      {
        id: "box",
        type: "container",
        rows: 1,
        cols: 1,
        gap: "md",
        columnWeights: [1],
        rowWeights: [1],
        cells: [[[]]],
      },
      text("c", "DND-AFTER"),
    ],
    "DND-MOVE-ME"
  );

  const shell = page.locator(".design-shell", { has: page.locator(".portal-markdown", { hasText: "DND-MOVE-ME" }) }).last();
  await shell.hover({ position: { x: 60, y: 10 } });
  const tab = shell.locator("> .design-shell-tab");
  await expect(tab).toBeVisible();
  const from = (await tab.boundingBox())!;
  const cell = (await page.getByText("Empty cell — drop a block here").boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 30, { steps: 5 });
  await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2, { steps: 25 });
  await page.mouse.up();

  // Still on the page — and now inside the container's cell, which no longer reads as empty.
  await expect(marker(page, "DND-MOVE-ME")).toHaveCount(1);
  await expect(marker(page, "DND-AFTER")).toHaveCount(1);
  await expect(page.getByText("Empty cell — drop a block here")).toHaveCount(0);
});

test("Cmd/Ctrl+Shift+Z redoes, and undo inside a text field is left to the field", async ({ page }) => {
  await loadPageBlocks(page, [text("a", "UNDO-ONE")], "UNDO-ONE");
  const modifier = process.platform === "darwin" ? "Meta" : "Control";

  // Edit the block through its own textarea.
  await page.waitForTimeout(500); // let the loaded page settle into history before editing
  await marker(page, "UNDO-ONE").click();
  const field = page.locator("textarea.font-mono").first();
  await field.fill("UNDO-TWO");
  await expect(marker(page, "UNDO-TWO")).toBeVisible();
  await page.waitForTimeout(500); // history entries are debounced

  // Inside a text field the shortcut is left alone (not preventDefault-ed), so the field's own undo runs.
  const prevented = await field.evaluate((el) => {
    const ev = new KeyboardEvent("keydown", { key: "z", metaKey: true, ctrlKey: true, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await field.fill("UNDO-TWO");
  await expect(marker(page, "UNDO-TWO")).toBeVisible();
  await page.waitForTimeout(500);

  // Outside a field it does, and Shift+Z brings it back.
  await page.locator("[data-page-background]").click({ position: { x: 4, y: 4 } });
  await page.keyboard.press(`${modifier}+z`);
  await expect(marker(page, "UNDO-ONE")).toBeVisible();
  await page.keyboard.press(`${modifier}+Shift+z`);
  await expect(marker(page, "UNDO-TWO")).toBeVisible();
});

test("clicking a button block in the designer selects it instead of opening its link", async ({ page }) => {
  await loadPageBlocks(
    page,
    [text("a", "CTA-HEAD"), { id: "b", type: "cta", label: "CTA-BUTTON", url: "https://example.com/should-not-open" }],
    "CTA-HEAD"
  );
  const popups: string[] = [];
  page.on("popup", (p) => popups.push(p.url()));
  await page.getByRole("link", { name: "CTA-BUTTON" }).click();
  await expect(page.locator('.design-shell[data-selected="true"]', { hasText: "CTA-BUTTON" })).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(popups).toEqual([]);
});

test("cleanup: no 'Edit' in the block menu, built-in page names are read-only, image blocks use the shared Layout group", async ({ page }) => {
  await loadPageBlocks(
    page,
    [text("a", "CLN-TEXT"), { id: "i", type: "image", url: "https://example.com/a.jpg", alt: "x" }],
    "CLN-TEXT"
  );
  // Page settings (nothing selected): a built-in page's name is fixed.
  await expect(page.getByLabel("Page name")).toHaveCount(0); // no label association: use the text
  const nameInput = page.locator("input[readonly]").first();
  await expect(nameInput).toBeVisible();

  // Right-click menu: Duplicate / Change type / Delete — and no redundant Edit (right-click already selects).
  await marker(page, "CLN-TEXT").click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Edit", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // An image block shows the same Layout group as other blocks, plus Crop image.
  // (dispatched: the remote image never loads, so it never counts as "stable" for a real click)
  await page.locator(".design-shell img").first().dispatchEvent("click");
  await expect(page.getByText("Layout", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Crop image" })).toBeVisible();
  await expect(page.getByText("Responsive layout")).toHaveCount(0);
});
