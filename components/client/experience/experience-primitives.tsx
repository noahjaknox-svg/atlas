import { cn } from "@/lib/utils";

/** Shared horizontal padding for experience + aircraft portal pages. */
export const experiencePageX = "px-6 sm:px-12 lg:px-20";

/** Max content width aligned with text, cards, charts, and images (~1152px). */
export const experienceContentMax = "mx-auto w-full max-w-6xl";

/** Consistent vertical rhythm between major sections. */
export const experienceSectionGap = "mt-8 sm:mt-10";

/** Tighter gap when an image follows related content directly above. */
export const experienceSectionGapTight = "mt-6 sm:mt-8";

/** Bottom padding so final content clears the footer comfortably. */
export const experiencePageBottom = "pb-12 sm:pb-16";

/** Glass panel for readable content over cloud backdrop. */
export const experienceGlass =
  "rounded-xl border border-white/10 bg-[#0B0F1A]/55 backdrop-blur-sm";

/** Scroll offset so in-page anchors and headings clear the sticky nav. */
export const experienceScrollAnchor = "scroll-mt-[calc(var(--portal-nav-height)+1.25rem)]";

export function SectionNumber({ n }: { n: string }) {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.35em] text-atlas-accent">{n}</span>
  );
}

export function ExperienceHeroTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "mt-2 font-serif text-2xl text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)] sm:mt-3 sm:text-3xl",
        experienceScrollAnchor,
        className
      )}
    >
      {children}
    </h1>
  );
}

export function ExperienceHero({
  children,
  className,
  large,
}: {
  children: React.ReactNode;
  className?: string;
  /** Welcome-style larger title area. */
  large?: boolean;
}) {
  return (
    <div className={cn("relative", experiencePageX, className)}>
      <div
        className={cn(
          large ? "pb-6 pt-5 sm:pb-8 sm:pt-7" : "pb-4 pt-5 sm:pb-5 sm:pt-7"
        )}
      >
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
    <div className={cn("py-8 sm:py-10", experiencePageBottom, experiencePageX, className)}>
      {fullWidth ? (
        children
      ) : (
        <div className={experienceContentMax}>{children}</div>
      )}
    </div>
  );
}

export function ExperienceDisclaimer({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <footer
      className={cn(
        "border-t border-white/10 bg-[#0B0F1A]/40 py-6 text-center text-xs leading-relaxed text-white/40 backdrop-blur-sm",
        experiencePageX
      )}
    >
      <p className="mx-auto max-w-3xl">{text}</p>
    </footer>
  );
}
