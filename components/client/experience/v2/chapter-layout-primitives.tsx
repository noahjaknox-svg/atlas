"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { experienceGlassV2 } from "./experience-tokens";

export const chapterTitleV2 =
  "font-serif text-2xl leading-tight text-white sm:text-3xl lg:text-4xl";

export const chapterSectionV2 = "flex flex-col gap-4 lg:gap-6";

export const chapterGrid2ColV2 =
  "grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-8";

export function ChapterHeader({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("shrink-0", className)}>
      <h1 className={chapterTitleV2}>{title}</h1>
      {subtitle ? <div className="mt-2 sm:mt-3">{subtitle}</div> : null}
    </header>
  );
}

export function ChapterBody({
  children,
  className,
  clampLines = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** When > 0, collapse long copy with Read more. */
  clampLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const useClamp = clampLines > 0 && !expanded;

  return (
    <div className={cn(experienceGlassV2, "p-4 sm:p-5", className)}>
      <div
        className={cn(
          "text-sm leading-relaxed text-white/85 sm:text-base",
          useClamp && "line-clamp-[8] sm:line-clamp-none"
        )}
        style={useClamp ? { WebkitLineClamp: clampLines } : undefined}
      >
        {children}
      </div>
      {clampLines > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-atlas-accent hover:underline sm:hidden"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

export function ChapterSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn(chapterSectionV2, className)}>{children}</section>;
}

export function ChapterGrid2Col({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(chapterGrid2ColV2, className)}>{children}</div>;
}
