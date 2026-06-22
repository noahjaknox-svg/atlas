import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceHeroTitle,
  ExperienceSlide,
  experienceGlass,
  experienceScrollCopy,
  SectionNumber,
} from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";

export function ConformityPage({
  section,
  branding,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const blocks = section.contentBlocks ?? {};
  const introBullets = blocks.introBullets ?? [];
  const goalBullets = blocks.goalBullets ?? [];
  const checklist = blocks.checklist ?? [];
  const recordsIssues = blocks.recordsIssues ?? [];
  const timeline = blocks.timeline ?? [];
  const explainerCards = blocks.explainerCards ?? [];

  return (
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="06" />
          <ExperienceHeroTitle className="max-w-3xl">
            Transition &amp; Conformity Process Guide
          </ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-3 lg:grid-cols-3 lg:gap-4">
          <RevealOnScroll className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <h2 className="font-serif text-base sm:text-lg">What to expect</h2>
            <div className={cn(experienceScrollCopy, "max-h-[22vh]")}>
              <p className="text-xs leading-relaxed text-white/80 sm:text-sm">
                {section.bodyCopy}
              </p>
            </div>
            {introBullets.length > 0 ? (
              <ul className="space-y-1">
                {introBullets.slice(0, 4).map((b) => (
                  <li key={b} className="flex gap-2 text-xs text-white/75">
                    <span className="text-atlas-accent">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
            {goalBullets.length > 0 ? (
              <div className="min-h-0 flex-1">
                <h3 className="mt-2 font-serif text-sm text-atlas-accent">Our goal</h3>
                <ul className="mt-1 grid gap-1">
                  {goalBullets.slice(0, 3).map((b) => (
                    <li key={b} className={cn(experienceGlass, "px-2 py-1.5 text-xs text-white/75")}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </RevealOnScroll>

          <RevealOnScroll delayMs={80} className="flex min-h-0 flex-col gap-2 overflow-hidden">
            {checklist.length > 0 ? (
              <>
                <h2 className="font-serif text-base sm:text-lg">Conformity process</h2>
                <p className="text-xs text-white/65">
                  Validates operational and regulatory requirements for FAA Part 135 under PrismJet.
                </p>
                <ol className="min-h-0 flex-1 space-y-1 overflow-hidden">
                  {checklist.slice(0, 6).map((item, i) => (
                    <li key={item.label} className="flex gap-2 text-xs text-white/80">
                      <span className="font-mono text-atlas-accent">{String(i + 1).padStart(2, "0")}</span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {recordsIssues.length > 0 ? (
              <div className="shrink-0 rounded-xl border border-atlas-accent/30 bg-atlas-accent/5 p-3">
                <h3 className="font-serif text-sm text-atlas-accent">Records matter most</h3>
                <ul className="mt-1 space-y-0.5">
                  {recordsIssues.slice(0, 3).map((issue) => (
                    <li key={issue} className="text-xs text-white/70">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </RevealOnScroll>

          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            {timeline.length > 0 ? (
              <RevealOnScroll delayMs={120} className="min-h-0 flex-1 overflow-hidden">
                <h2 className="font-serif text-base sm:text-lg">Timeline</h2>
                <div className="mt-2 space-y-2">
                  {timeline.slice(0, 3).map((phase) => (
                    <div key={phase.phase} className="border-l-2 border-atlas-accent/40 pl-3">
                      <p className="text-[10px] uppercase tracking-wider text-atlas-accent">
                        {phase.window}
                      </p>
                      <h3 className="font-serif text-sm">{phase.phase}</h3>
                      <p className="mt-0.5 text-xs text-white/65">
                        {[...phase.ownerActions.slice(0, 1), ...phase.prismjetActions.slice(0, 1)].join(
                          " · "
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </RevealOnScroll>
            ) : null}
            {explainerCards.length > 0 ? (
              <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {explainerCards.slice(0, 2).map((card, i) => (
                  <RevealOnScroll key={card.title} delayMs={i * 60}>
                    <div className={cn(experienceGlass, "p-2.5 sm:p-3")}>
                      <h3 className="font-serif text-sm text-atlas-accent">{card.title}</h3>
                      <p className="mt-1 text-xs text-white/70">{card.body}</p>
                    </div>
                  </RevealOnScroll>
                ))}
              </div>
            ) : null}
            <ExperienceGallery
              items={section.contentBlocks?.gallery}
              layout="compact"
              slide
              className="min-h-0 shrink-0"
            />
          </div>
        </div>
      </ExperienceBody>
    </ExperienceSlide>
  );
}
