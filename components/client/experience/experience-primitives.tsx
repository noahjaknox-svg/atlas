import { cn } from "@/lib/utils";

/** Shared horizontal padding for experience + aircraft portal pages. */
export const experiencePageX = "px-6 sm:px-12 lg:px-20";

/** Max content width aligned with text, cards, charts, and images (~1152px). */
export const experienceContentMax = "mx-auto w-full max-w-6xl";

/** Full-height slide container — one viewport per experience page. */
export const experienceSlide =
  "flex h-full min-h-0 flex-col overflow-hidden";

/** Consistent vertical rhythm between major sections (legacy scroll pages). */
export const experienceSectionGap = "mt-8 sm:mt-10";

/** Tighter gap when an image follows related content directly above. */
export const experienceSectionGapTight = "mt-6 sm:mt-8";

/** Glass panel for readable content over cloud backdrop. */
export const experienceGlass =
  "rounded-xl border border-white/10 bg-[#0B0F1A]/55 backdrop-blur-sm";

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
        "mt-1 font-serif text-xl text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)] sm:text-2xl lg:text-3xl",
        className
      )}
    >
      {children}
    </h1>
  );
}

export function ExperienceSlide({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(experienceSlide, experiencePageX, className)}>
      {children}
    </div>
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
    <div className={cn("shrink-0", className)}>
      <div className={cn(large ? "pb-3 pt-4 sm:pt-5" : "pb-2 pt-4 sm:pt-5")}>
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
    <div className={cn("min-h-0 flex-1 overflow-hidden py-2 sm:py-3", className)}>
      {fullWidth ? (
        children
      ) : (
        <div className={cn(experienceContentMax, "h-full min-h-0")}>{children}</div>
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
