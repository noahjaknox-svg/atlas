import { describe, expect, it } from "vitest";
import {
  cropFrameAspectRatio,
  cropPlacementStyle,
  resolveImageDisplaySize,
} from "./experience-image-system";

describe("cropPlacementStyle", () => {
  const pct = (v: unknown) => parseFloat(String(v));

  it("sizes and offsets the image so the crop rectangle exactly fills the frame", () => {
    // Crop covers x 0.1–0.4 and y 0.2–0.7 of the source.
    const style = cropPlacementStyle({ x: 0.1, y: 0.2, width: 0.3, height: 0.5 })!;
    expect(pct(style.width)).toBeCloseTo(100 / 0.3, 2);
    expect(pct(style.height)).toBeCloseTo(100 / 0.5, 2);
    expect(pct(style.left)).toBeCloseTo((-100 * 0.1) / 0.3, 2);
    expect(pct(style.top)).toBeCloseTo((-100 * 0.2) / 0.5, 2);
  });

  it("moving the crop up or down moves the image by exactly that amount", () => {
    const top = cropPlacementStyle({ x: 0, y: 0, width: 1, height: 0.5 })!;
    const middle = cropPlacementStyle({ x: 0, y: 0.25, width: 1, height: 0.5 })!;
    const bottom = cropPlacementStyle({ x: 0, y: 0.5, width: 1, height: 0.5 })!;
    // Frame shows the top half, the middle half, then the bottom half of the image.
    expect(pct(top.top)).toBeCloseTo(0, 4);
    expect(pct(middle.top)).toBeCloseTo(-50, 4);
    expect(pct(bottom.top)).toBeCloseTo(-100, 4);
    // Each position is distinct (the old transform-origin math collapsed these).
    expect(new Set([top.top, middle.top, bottom.top]).size).toBe(3);
  });

  it("a full-image crop is the identity placement", () => {
    const style = cropPlacementStyle({ x: 0, y: 0, width: 1, height: 1 })!;
    expect(pct(style.width)).toBe(100);
    expect(pct(style.height)).toBe(100);
    expect(pct(style.left)).toBeCloseTo(0, 4);
    expect(pct(style.top)).toBeCloseTo(0, 4);
  });

  it("clamps an out-of-range crop so no empty space shows", () => {
    const style = cropPlacementStyle({ x: 0.9, y: 0.9, width: 0.3, height: 0.3 })!; // would run past the edge
    expect(pct(style.left)).toBeCloseTo((-100 * 0.7) / 0.3, 2);
    expect(pct(style.top)).toBeCloseTo((-100 * 0.7) / 0.3, 2);
  });

  it("ignores missing or empty crops", () => {
    expect(cropPlacementStyle(undefined)).toBeUndefined();
    expect(cropPlacementStyle({ x: 0, y: 0, width: 0, height: 0.5 })).toBeUndefined();
  });
});

describe("cropFrameAspectRatio", () => {
  it("formats numeric aspect for CSS", () => {
    expect(cropFrameAspectRatio(1)).toBe("1");
    expect(cropFrameAspectRatio(1.5)).toBe("1.5");
    expect(cropFrameAspectRatio(undefined)).toBeUndefined();
  });
});

describe("resolveImageDisplaySize", () => {
  it("prefers explicit imageSize", () => {
    expect(resolveImageDisplaySize({ imageSize: "icon" })).toBe("icon");
  });

  it("maps legacy variant to size", () => {
    expect(resolveImageDisplaySize({ variant: "hero" })).toBe("large");
    expect(resolveImageDisplaySize({ variant: "editorial-small" })).toBe("small");
  });

  it("defaults to fit", () => {
    expect(resolveImageDisplaySize({})).toBe("fit");
  });
});
