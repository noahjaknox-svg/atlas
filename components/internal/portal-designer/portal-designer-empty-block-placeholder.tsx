"use client";

import { Code2, ImageIcon, VideoIcon } from "lucide-react";
import { getImageSizeClasses } from "@/lib/experience-image-system";
import type { ImageDisplaySize } from "@/lib/experience-content";
import { cn } from "@/lib/utils";

const PLACEHOLDER_COPY = {
  image: {
    title: "Empty image",
    hint: "Upload or Browse Content in the sidebar",
  },
  video: {
    title: "Empty video",
    hint: "Add a video URL in the sidebar",
  },
  html: {
    title: "Empty HTML block",
    hint: "Paste HTML or an embed in the sidebar",
  },
} as const;

export function PortalDesignerEmptyBlockPlaceholder({
  type,
  imageSize = "fit",
  className,
}: {
  type: "image" | "video" | "html";
  imageSize?: ImageDisplaySize;
  className?: string;
}) {
  const copy = PLACEHOLDER_COPY[type];
  const Icon = type === "image" ? ImageIcon : type === "video" ? VideoIcon : Code2;

  return (
    <div
      className={cn(
        "flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/30 bg-white/[0.06] px-4 py-6 text-center",
        type === "image" && getImageSizeClasses(imageSize),
        className
      )}
      aria-label={copy.title}
    >
      <Icon className="h-8 w-8 text-white/35" strokeWidth={1.5} aria-hidden />
      <p className="text-sm font-medium text-white/55">{copy.title}</p>
      <p className="max-w-[12rem] text-xs leading-snug text-white/35">{copy.hint}</p>
    </div>
  );
}
