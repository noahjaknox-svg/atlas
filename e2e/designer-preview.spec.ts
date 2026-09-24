import { expect, test } from "@playwright/test";

test("master designer Preview opens a rendered preview, not a bounce back", async ({ page, context }) => {
  await page.goto("/aircraft-management/proposal-design");
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: /^preview$/i }).first().click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(/\/proposal-design\/preview\?previewToken=/);
  await expect(popup.getByText(/preview link has expired/i)).toHaveCount(0);
  await expect(popup.locator("main, [data-portal-shell], body").first()).not.toBeEmpty();
});
