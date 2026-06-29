import { describe, expect, it } from "vitest";
import {
  cropFrameAspectRatio,
  cropTransformStyle,
  cropUniformScale,
  resolveImageDisplaySize,
} from "./experience-image-system";

describe("cropUniformScale", () => {
  it("uses equal scale for square pixel crop on non-square source", () => {
    // 500x500 crop on 2000x1000 image → normalized 0.25 x 0.5
    const crop = { x: 0.1, y: 0.2, width: 0.25, height: 0.5 };
    const scale = cropUniformScale(crop);
    expect(scale).toBe(2); // 1 / max(0.25, 0.5)
    const style = cropTransformStyle(crop);
    expect(style?.transform).toBe("scale(2)");
    expect(style?.transform).not.toContain("scale(4, 2)");
  });

  it("returns 1 for invalid crop", () => {
    expect(cropUniformScale({ x: 0, y: 0, width: 0, height: 0.5 })).toBe(1);
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
