import { cn } from "@/lib/utils";

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
