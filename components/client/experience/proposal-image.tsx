"use client";

import { cn } from "@/lib/utils";
import {
  defaultObjectPositionForSrc,
  getVariantConfig,
  proposalImageFrameClass,
  type ProposalImageFit,
  type ProposalImageVariant,
} from "@/lib/experience-image-system";
import { ExperienceImage } from "./experience-image";

export type ProposalImageProps = {
  src: string;
  alt?: string;
  caption?: string;
  variant?: ProposalImageVariant;
  objectFit?: ProposalImageFit;
  objectPosition?: string;
  priority?: boolean;
  className?: string;
  frameClassName?: string;
  /** When true, caption is always visible with a bottom gradient. */
  showCaption?: boolean;
  /** Fill a parent grid/flex cell instead of using standalone aspect-ratio sizing. */
  sizing?: "variant" | "fill";
  onClick?: () => void;
};

export function ProposalImage({
  src,
  alt = "",
  caption,
  variant = "landscape-wide",
  objectFit,
  objectPosition,
  priority,
  className,
  frameClassName,
  showCaption = !!caption,
  sizing = "variant",
  onClick,
}: ProposalImageProps) {
  const config = getVariantConfig(variant);
  const fit = objectFit ?? config.objectFit;
  const position = objectPosition ?? defaultObjectPositionForSrc(src) ?? config.objectPosition;
  const fillParent = sizing === "fill";

  return (
    <div
      className={cn(
        proposalImageFrameClass("group w-full"),
        fillParent && "h-full min-h-[200px]",
        onClick && "cursor-pointer",
        frameClassName
      )}
      style={
        fillParent
          ? undefined
          : {
              aspectRatio: config.aspectRatio,
              maxHeight: config.maxHeight,
            }
      }
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <ExperienceImage
        src={src}
        alt={alt || caption || ""}
        fill
        priority={priority}
        sizes={config.sizes}
        objectFit={fit}
        objectPosition={position}
        className={cn(
          "transition-transform duration-700",
          onClick && "group-hover:scale-[1.02]",
          className
        )}
      />
      {showCaption && caption ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0B0F1A]/90 via-[#0B0F1A]/35 to-transparent" />
          <span className="absolute bottom-3 left-4 right-4 text-left text-sm leading-snug text-white/90 sm:bottom-4 sm:left-5">
            {caption}
          </span>
        </>
      ) : null}
    </div>
  );
}
