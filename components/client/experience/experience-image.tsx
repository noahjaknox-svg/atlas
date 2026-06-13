"use client";

import Image from "next/image";
import { isLocalProposalImage } from "@/lib/proposal-images";
import { cn } from "@/lib/utils";

export function ExperienceImage({
  src,
  alt = "",
  className,
  fill,
  priority,
  sizes,
}: {
  src: string;
  alt?: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  if (isLocalProposalImage(src) || src.startsWith("/images/")) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-cover", className)}
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
        className={cn("h-full w-full object-cover", className)}
        priority={priority}
        sizes={sizes ?? "100vw"}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />
  );
}
