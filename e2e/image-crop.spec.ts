import { expect, test, type Page } from "@playwright/test";

// A 300x900 image: red top third, green middle third, blue bottom third. Cropped to a 300x300
// window at different vertical positions, the frame must show exactly that third.
const SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="900">' +
      '<rect width="300" height="300" y="0" fill="#ff0000"/>' +
      '<rect width="300" height="300" y="300" fill="#00ff00"/>' +
      '<rect width="300" height="300" y="600" fill="#0000ff"/></svg>'
  );

async function renderCropped(page: Page, y: number) {
  const content = await (await page.request.get("/api/portal-content")).json();
  const about = (content.content.experienceTemplates as Array<{ sectionType: string }>).find((t) => t.sectionType === "about_us")!;
  const block = {
    id: "crop-img",
    type: "image",
    url: SVG,
    alt: "crop test",
    imageSize: "fit",
    crop: { x: 0, y, width: 1, height: 1 / 3 },
    cropAspectRatio: 1, // 300 x 300 window
  };
  const res = await page.request.post("/api/portal-content/designer-preview", {
    data: { sections: [{ ...about, visible: true, contentBlocks: { pageBlocks: [block] } }], activePageSlug: "about-us" },
  });
  const { token } = await res.json();
  await page.goto(`/aircraft-management/proposal-design/preview?previewToken=${token}&page=about-us`);
  const img = page.locator('img[alt="crop test"]');
  await expect(img).toBeVisible();
  // Which colour is showing at the centre of the frame?
  return img.evaluate((el) => {
    const frame = el.parentElement!.getBoundingClientRect();
    const i = el.getBoundingClientRect();
    return {
      frameHeight: frame.height,
      imageHeightRatio: i.height / frame.height,
      imageOffsetRatio: (i.top - frame.top) / frame.height,
    };
  });
}

test.use({ viewport: { width: 1400, height: 1000 } });

test("a saved crop shows exactly the chosen part of the image when moved up and down", async ({ page }) => {
  // y = 0, 1/3, 2/3 → red, green, blue thirds. The image is 3x the frame's height and shifted up by 0, 1, 2 frames.
  for (const [y, shift] of [[0, 0], [1 / 3, 1], [2 / 3, 2]] as const) {
    const m = await renderCropped(page, y);
    expect(m.imageHeightRatio).toBeCloseTo(3, 1);
    expect(m.imageOffsetRatio).toBeCloseTo(-shift, 1);
  }
});

test("reopening Edit Image starts at the saved crop, so applying without changes keeps it", async ({ page }) => {
  await page.goto("/aircraft-management/proposal-design");
  await page.getByRole("button", { name: /^Page code/i }).click();
  const code = page.getByLabel("Page code JSON");
  const record = JSON.parse(await code.inputValue());
  const saved = { x: 0, y: 2 / 3, width: 1, height: 1 / 3 }; // the bottom (blue) third
  record.contentBlocks = {
    pageBlocks: [{ id: "crop-img", type: "image", url: SVG, alt: "crop test", imageSize: "fit", crop: saved, cropAspectRatio: 1 }],
  };
  await code.fill(JSON.stringify(record));
  await page.getByRole("button", { name: /^(Apply|Applied!)$/ }).click();

  // Select the image block and reopen the crop editor.
  await page.getByRole("button", { name: /^Outline/ }).click();
  await page.getByText("Image", { exact: true }).last().click();
  await page.getByRole("button", { name: /^Outline/ }).click(); // collapse it; it overlaps the inspector's buttons
  await page.getByRole("button", { name: "Edit Image" }).click();
  await expect(page.locator(".reactEasyCrop_Image")).toBeVisible();
  await page.waitForTimeout(800); // let the cropper position itself and report its area
  await page.getByRole("button", { name: "Apply", exact: true }).last().click();

  // What the designer now holds for this block (Preview sends the unsaved state; nothing is written).
  const previewRequest = page.waitForRequest((r) => r.url().endsWith("/api/portal-content/designer-preview") && r.method() === "POST");
  const popup = page.context().waitForEvent("page");
  await page.getByRole("button", { name: /^preview$/i }).first().click();
  const body = JSON.parse((await previewRequest).postData() ?? "{}");
  await (await popup).close();
  const image = JSON.stringify(body.sections).match(/"type":"image"[^}]*"crop":\{[^}]*\}/)?.[0] ?? "";
  const crop = JSON.parse(image.slice(image.indexOf('"crop":') + 7));
  expect(crop.y).toBeCloseTo(2 / 3, 1); // still the bottom third, not reset to the centre
  expect(crop.height).toBeCloseTo(1 / 3, 1);
});
