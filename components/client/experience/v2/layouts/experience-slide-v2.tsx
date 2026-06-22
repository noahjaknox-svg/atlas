import { cn } from "@/lib/utils";
import { experienceContentMaxV2, experiencePageXV2, experienceSlideV2 } from "../experience-tokens";

export function ExperienceSlideV2({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        experienceSlideV2,
        experiencePageXV2,
        "justify-center overflow-y-auto",
        className
      )}
    >
      <div
        className={cn(
          experienceContentMaxV2,
          "flex flex-col justify-center py-2 sm:py-3"
        )}
      >
        {children}
      </div>
    </div>
  );
}
