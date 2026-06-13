import { CloudBackground } from "@/components/client/cloud-background";
import { cn } from "@/lib/utils";

/** Shared horizontal padding for experience + aircraft portal pages. */
export const experiencePageX = "px-6 sm:px-12 lg:px-20";

export function SectionNumber({ n }: { n: string }) {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.35em] text-atlas-accent">{n}</span>
  );
}

export function ExperienceHero({
  imageUrl,
  videoUrl,
  posterUrl,
  children,
  className,
  kenBurns,
}: {
  imageUrl: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  children: React.ReactNode;
  className?: string;
  kenBurns?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        /* Pull cloud band under fixed nav; content clears nav once */
        "-mt-[var(--portal-nav-height)] pt-[var(--portal-nav-height)]",
        className
      )}
    >
      <CloudBackground
        imageUrl={imageUrl}
        videoUrl={videoUrl}
        posterUrl={posterUrl ?? imageUrl}
        overlay="dark"
        fillContainer
        className={cn(
          "absolute inset-0 min-h-full",
          kenBurns && "experience-hero-kenburns overflow-hidden"
        )}
      />
      <div className={cn("relative z-10 pb-8 pt-2 sm:pb-10 sm:pt-3", experiencePageX)}>
        {children}
      </div>
    </div>
  );
}

export function ExperienceBody({
  children,
  className,
  fullWidth,
}: {
  children: React.ReactNode;
  className?: string;
  /** Skip max-width wrapper (e.g. wide pro forma table). */
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("bg-[#0B0F1A] py-12", experiencePageX, className)}>
      {fullWidth ? (
        children
      ) : (
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      )}
    </div>
  );
}

export function ExperienceDisclaimer({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <footer
      className={cn(
        "border-t border-white/10 bg-[#0B0F1A] py-6 text-center text-xs leading-relaxed text-white/40",
        experiencePageX
      )}
    >
      <p className="mx-auto max-w-3xl">{text}</p>
    </footer>
  );
}
