import { cn } from "@/lib/utils";
import {
  experienceContentMaxV2,
  experiencePageXV2,
  experienceSlideV2,
  experienceViewportLockV2,
} from "../experience-tokens";

export function ExperienceSlideV2({
  children,
  className,
  contentClassName,
  lockViewport = false,
  flushBottom = false,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Pin slide to the shell content band — inner regions scroll instead of the page. */
  lockViewport?: boolean;
  /** Remove bottom padding on lockViewport slides so content extends to the footer edge. */
  flushBottom?: boolean;
}) {
  return (
    <div
      className={cn(
        experienceSlideV2,
        experiencePageXV2,
        "justify-start",
        lockViewport && experienceViewportLockV2,
        lockViewport && "flex-1",
        className
      )}
    >
      <div
        className={cn(
          experienceContentMaxV2,
          lockViewport
            ? cn(
                "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
                flushBottom ? "pt-3 sm:pt-4" : "py-3 sm:py-4"
              )
            : "flex flex-col justify-start py-4 sm:py-6 lg:py-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
