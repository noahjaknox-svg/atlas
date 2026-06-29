"use client";

import Image from "next/image";
import { isLocalProposalImage } from "@/lib/proposal-images";
import type { ProposalImageFit } from "@/lib/experience-image-system";
import { cn } from "@/lib/utils";

export function ExperienceImage({
  src,
  alt = "",
  className,
  fill,
  intrinsic,
  priority,
  sizes,
  objectFit = "cover",
  objectPosition = "center",
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  fill?: boolean;
  /** Natural width/height — no forced aspect box. */
  intrinsic?: boolean;
  priority?: boolean;
  sizes?: string;
  objectFit?: ProposalImageFit;
  objectPosition?: string;
  style?: React.CSSProperties;
}) {
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  if (intrinsic) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("block h-auto w-full max-w-full", fitClass, className)}
        style={{ objectPosition, ...style }}
      />
    );
  }

  if (isLocalProposalImage(src) || src.startsWith("/images/")) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn(fitClass, className)}
          style={{ objectPosition, ...style }}
          priority={priority}
          sizes={sizes ?? "100vw"}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={1920}
        height={1080}
        className={cn("h-full w-full", fitClass, className)}
        style={{ objectPosition, ...style }}
        priority={priority}
        sizes={sizes ?? "100vw"}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full", fitClass, className)}
      style={{ objectPosition, ...style }}
    />
  );
}
