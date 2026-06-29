"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO = "/images/prismjet-logo-dark.png";

export function ThemeLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO}
      alt="PrismJet"
      width={246}
      height={87}
      className={cn("invert dark:invert-0", className)}
      priority={priority}
    />
  );
}
