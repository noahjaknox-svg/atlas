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
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Pin slide to the shell content band — inner regions scroll instead of the page. */
  lockViewport?: boolean;
}) {
  return (
    <div
      className={cn(
        experienceSlideV2,
        experiencePageXV2,
        "justify-start",
        lockViewport && experienceViewportLockV2,
        className
      )}
    >
      <div
        className={cn(
          experienceContentMaxV2,
          lockViewport
            ? "flex min-h-0 flex-1 flex-col overflow-hidden py-3 sm:py-4"
            : "flex flex-col justify-start py-4 sm:py-6 lg:py-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
