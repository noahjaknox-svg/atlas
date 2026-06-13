"use client";

import { cn } from "@/lib/utils";
import { useReveal } from "./use-reveal";

export function RevealOnScroll({
  children,
  className,
  delayMs = 0,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  /** Show immediately (above-the-fold heroes) — no initial opacity-0. */
  immediate?: boolean;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const visible = immediate || shown;

  if (immediate) {
    return (
      <div className={cn("motion-safe:animate-[fadeUp_0.6s_ease-out]", className)}>{children}</div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        !visible && "opacity-0 translate-y-3",
        visible && "motion-safe:animate-[fadeUp_0.6s_ease-out_forwards]",
        className
      )}
      style={visible && delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
