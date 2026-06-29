import { describe, expect, it } from "vitest";
import {
  getStockMediaItems,
  isImageMediaUrl,
  mediaKindFromUrl,
} from "./media-library";

describe("media-library", () => {
  it("lists stock proposal images", () => {
    const items = getStockMediaItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.source === "stock")).toBe(true);
    expect(items.every((item) => item.url.startsWith("/images/proposals/"))).toBe(true);
  });

  it("detects image vs video URLs", () => {
    expect(isImageMediaUrl("/uploads/photo.jpg")).toBe(true);
    expect(isImageMediaUrl("/uploads/clip.mp4")).toBe(false);
    expect(mediaKindFromUrl("/uploads/clip.webm")).toBe("video");
  });
});
