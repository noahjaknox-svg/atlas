"use client";

import { cn } from "@/lib/utils";
import {
  cropFrameAspectRatio,
  cropTransformStyle,
  defaultObjectPositionForSrc,
  getImageSizeClasses,
  getVariantConfig,
  isCompactImageSize,
  proposalImageFrameClass,
  resolveCropDisplayAspectRatio,
  type ProposalImageFit,
  type ProposalImageVariant,
} from "@/lib/experience-image-system";
import type { ImageCropRect, ImageDisplaySize } from "@/lib/experience-content";
import { ExperienceImage } from "./experience-image";

export type ProposalImageProps = {
  src: string;
  alt?: string;
  caption?: string;
  variant?: ProposalImageVariant;
  imageSize?: ImageDisplaySize;
  objectFit?: ProposalImageFit;
  objectPosition?: string;
  crop?: ImageCropRect;
  cropAspectRatio?: number;
  priority?: boolean;
  className?: string;
  frameClassName?: string;
  showCaption?: boolean;
  sizing?: "variant" | "fill" | "intrinsic";
  onClick?: () => void;
};

export function ProposalImage({
  src,
  alt = "",
  caption,
  variant = "landscape-wide",
  imageSize = "fit",
  objectFit,
  objectPosition,
  crop,
  cropAspectRatio,
  priority,
  className,
  frameClassName,
  showCaption = !!caption,
  sizing = "variant",
  onClick,
}: ProposalImageProps) {
  const config = getVariantConfig(variant);
  const fillParent = sizing === "fill";
  const intrinsic = sizing === "intrinsic";
  const hasCrop = crop != null && crop.width > 0 && crop.height > 0;
  const fit =
    objectFit ??
    (intrinsic ? (hasCrop ? "cover" : "contain") : config.objectFit);
  const position =
    objectPosition ?? defaultObjectPositionForSrc(src) ?? config.objectPosition;
  const cropStyle = hasCrop ? cropTransformStyle(crop) : undefined;
  const displayAspect = hasCrop ? resolveCropDisplayAspectRatio(crop, cropAspectRatio) : undefined;
  const intrinsicAspect = displayAspect != null ? cropFrameAspectRatio(displayAspect) : undefined;
  const compactImage = isCompactImageSize(imageSize);

  if (intrinsic) {
    return (
      <div
        className={cn(
          proposalImageFrameClass("group"),
          getImageSizeClasses(imageSize),
          hasCrop && "relative w-full min-h-[140px] overflow-hidden",
          !hasCrop && (compactImage ? "inline-block max-w-full" : "block w-full min-w-0"),
          onClick && "cursor-pointer",
          frameClassName
        )}
        style={
          hasCrop && intrinsicAspect
            ? { aspectRatio: intrinsicAspect }
            : undefined
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
        {hasCrop ? (
          <div className="absolute inset-0 overflow-hidden">
            <ExperienceImage
              src={src}
              alt={alt || caption || ""}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, 900px"
              objectFit={fit}
              objectPosition={position}
              className={cn(
                "transition-transform duration-700",
                onClick && "group-hover:scale-[1.02]",
                className
              )}
              style={cropStyle}
            />
          </div>
        ) : (
          <ExperienceImage
            src={src}
            alt={alt || caption || ""}
            intrinsic
            priority={priority}
            sizes="(max-width: 768px) 100vw, 900px"
            objectFit={fit}
            objectPosition={position}
            className={cn(
              "block",
              imageSize === "icon" && "max-h-16 max-w-16 object-contain",
              "transition-transform duration-700",
              onClick && "group-hover:scale-[1.02]",
              className
            )}
          />
        )}
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
      <div className="absolute inset-0 overflow-hidden">
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
          style={cropStyle}
        />
      </div>
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
