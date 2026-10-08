import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import type { BlockLayout, ImageCropRect, ImageDisplaySize } from "@/lib/experience-content";

/** Reusable image presentation variants for the PrismJet proposal experience. */
export type ProposalImageVariant =
  | "hero"
  | "editorial-large"
  | "editorial-small"
  | "portrait-featured"
  | "portrait-standard"
  | "landscape-wide";

export type ProposalImageFit = "cover" | "contain";

export type ProposalImageVariantConfig = {
  aspectRatio: string;
  maxHeight: string;
  objectFit: ProposalImageFit;
  objectPosition: string;
  sizes: string;
};

export const PROPOSAL_IMAGE_VARIANTS: Record<ProposalImageVariant, ProposalImageVariantConfig> = {
  hero: {
    aspectRatio: "21 / 9",
    maxHeight: "min(52vh, 560px)",
    objectFit: "cover",
    objectPosition: "center",
    sizes: "(max-width: 768px) 100vw, 1200px",
  },
  "editorial-large": {
    aspectRatio: "16 / 10",
    maxHeight: "min(56vh, 520px)",
    objectFit: "cover",
    objectPosition: "center",
    sizes: "(max-width: 768px) 100vw, 900px",
  },
  "editorial-small": {
    aspectRatio: "4 / 3",
    maxHeight: "min(40vh, 320px)",
    objectFit: "cover",
    objectPosition: "center",
    sizes: "(max-width: 768px) 100vw, 480px",
  },
  "portrait-featured": {
    aspectRatio: "5 / 4",
    maxHeight: "min(42vh, 420px)",
    objectFit: "cover",
    objectPosition: "center top",
    sizes: "(max-width: 768px) 100vw, 720px",
  },
  "portrait-standard": {
    aspectRatio: "3 / 4",
    maxHeight: "min(36vh, 360px)",
    objectFit: "cover",
    objectPosition: "center top",
    sizes: "(max-width: 768px) 50vw, 360px",
  },
  "landscape-wide": {
    aspectRatio: "16 / 9",
    maxHeight: "min(50vh, 520px)",
    objectFit: "cover",
    objectPosition: "center",
    sizes: "(max-width: 768px) 100vw, 1200px",
  },
};

/** Shared card frame for proposal imagery — matches experienceGlass panels. */
export const proposalImageFrame =
  "relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]";

/** Vertical spacing between content sections and image blocks. */
export const experienceImageSectionMt = "mt-8 sm:mt-10";

/** Max content width aligned with body copy and cards (~1152px). */
export const experienceContentMax = "mx-auto w-full max-w-6xl";

/** Readable paragraph measure. */
export const experienceProseMeasure = "max-w-prose";

export function getVariantConfig(variant: ProposalImageVariant): ProposalImageVariantConfig {
  return PROPOSAL_IMAGE_VARIANTS[variant];
}

/** Numeric width/height ratio for crop tools (e.g. react-easy-crop `aspect` prop). */
export function aspectRatioNumber(variant: ProposalImageVariant): number {
  const raw = PROPOSAL_IMAGE_VARIANTS[variant].aspectRatio;
  const parts = raw.split("/").map((part) => Number(part.trim()));
  if (parts.length === 2 && parts[0]! > 0 && parts[1]! > 0) {
    return parts[0]! / parts[1]!;
  }
  return 16 / 9;
}

export function proposalImageFrameClass(className?: string) {
  return cn(proposalImageFrame, className);
}

/** Per-image object-position overrides for known local assets. */
export function defaultObjectPositionForSrc(src: string): string | undefined {
  if (src.includes("team_casey")) return "center 12%";
  if (src.includes("team_bianco")) return "center 10%";
  if (src.includes("team_pixley")) return "center 8%";
  if (src.includes("team_turcott")) return "center 12%";
  if (src.includes("lifestyle_087")) return "center 35%";
  if (src.includes("engine_wing")) return "center 55%";
  if (src.includes("fleet_three")) return "center 40%";
  if (src.includes("DSC03648")) return "center 45%";
  if (src.includes("untitled_design")) return "center center";
  return undefined;
}

/** Resolve portal image size from explicit field or legacy variant/width. */
export function resolveImageDisplaySize(
  block: {
    imageSize?: ImageDisplaySize;
    variant?: ProposalImageVariant;
    blockLayout?: BlockLayout;
  }
): ImageDisplaySize {
  if (block.imageSize) return block.imageSize;
  const variant = block.variant;
  if (
    variant === "hero" ||
    variant === "editorial-large" ||
    variant === "landscape-wide" ||
    variant === "portrait-featured"
  ) {
    return "large";
  }
  if (variant === "editorial-small" || variant === "portrait-standard") {
    return "small";
  }
  const width = block.blockLayout?.width;
  if (width === "narrow" || width === "medium") {
    return "small";
  }
  return "fit";
}

export function getImageSizeClasses(size: ImageDisplaySize = "fit"): string {
  switch (size) {
    case "icon":
      return "max-h-16 max-w-16 w-auto";
    case "small":
      return "max-w-xs w-auto";
    case "large":
      return "max-h-[min(60vh,640px)] w-full";
    case "fit":
    default:
      return "w-full max-w-full";
  }
}

/**
 * Style that places the full image so exactly the saved crop rectangle fills its frame.
 *
 * `crop` holds the crop as fractions of the source image (x, y, width, height), and the frame's
 * aspect ratio is the crop's own pixel aspect (cropAspectRatio), so the image only needs to be
 * stretched to 1/w by 1/h of the frame and shifted by -x/w, -y/h of it. This is exact for any
 * position, including vertical moves — the previous transform-origin trick was only right when
 * the crop touched the top-left corner.
 */
export function cropPlacementStyle(crop?: ImageCropRect): CSSProperties | undefined {
  if (!crop || !(crop.width > 0) || !(crop.height > 0)) return undefined;
  const w = Math.min(1, crop.width);
  const h = Math.min(1, crop.height);
  // Keep the crop inside the image so a slightly out-of-range save can't expose empty space.
  const x = Math.max(0, Math.min(crop.x, 1 - w));
  const y = Math.max(0, Math.min(crop.y, 1 - h));
  return {
    position: "absolute",
    width: `${(100 / w).toFixed(4)}%`,
    height: `${(100 / h).toFixed(4)}%`,
    left: `${((-100 * x) / w).toFixed(4)}%`,
    top: `${((-100 * y) / h).toFixed(4)}%`,
    right: "auto",
    bottom: "auto",
    maxWidth: "none",
  };
}

export function cropFrameAspectRatio(cropAspectRatio?: number): string | undefined {
  if (cropAspectRatio == null || !Number.isFinite(cropAspectRatio) || cropAspectRatio <= 0) {
    return undefined;
  }
  return String(cropAspectRatio);
}

/** Prefer stored pixel aspect; fall back so cropped frames never collapse to zero height. */
export function resolveCropDisplayAspectRatio(
  crop?: ImageCropRect,
  cropAspectRatio?: number
): number | undefined {
  const stored = cropFrameAspectRatio(cropAspectRatio);
  if (stored != null) return cropAspectRatio;
  if (crop != null && crop.width > 0 && crop.height > 0) {
    return crop.width / crop.height;
  }
  return undefined;
}

export function isCompactImageSize(size: ImageDisplaySize): boolean {
  return size === "icon" || size === "small";
}
