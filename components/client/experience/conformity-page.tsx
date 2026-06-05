import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";

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
  const ownerRecommendations = blocks.ownerRecommendations ?? [];
  const downtimeStrategies = blocks.downtimeStrategies ?? [];
  const explainerCards = blocks.explainerCards ?? [];

  return (
    <>
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll>
          <SectionNumber n="06" />
          <h1 className="mt-3 max-w-3xl font-serif text-3xl sm:text-4xl lg:text-5xl">
            Transition &amp; Conformity Process Guide
          </h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody className="space-y-16">
        <RevealOnScroll>
          <h2 className="font-serif text-2xl">What to expect in the transition</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
          {introBullets.length > 0 ? (
            <ul className="mt-6 max-w-2xl space-y-2">
              {introBullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-white/75">
                  <span className="text-atlas-accent">•</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </RevealOnScroll>

        {goalBullets.length > 0 ? (
          <RevealOnScroll>
            <h2 className="font-serif text-2xl">PrismJet&apos;s goal in the transition</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {goalBullets.map((b) => (
                <li
                  key={b}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75"
                >
                  {b}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        ) : null}

        {checklist.length > 0 ? (
          <RevealOnScroll>
            <h2 className="font-serif text-2xl">The conformity process</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/65">
              Conformity validates that the aircraft meets all operational and regulatory requirements
              for FAA Part 135 operations under the PrismJet certificate.
            </p>
            <ol className="mt-6 space-y-2">
              {checklist.map((item, i) => (
                <li key={item.label} className="flex gap-4 text-sm text-white/80">
                  <span className="font-mono text-atlas-accent">{String(i + 1).padStart(2, "0")}</span>
                  {item.label}
                </li>
              ))}
            </ol>
          </RevealOnScroll>
        ) : null}

        {recordsIssues.length > 0 ? (
          <RevealOnScroll>
            <div className="rounded-xl border border-atlas-accent/30 bg-atlas-accent/5 p-6 sm:p-8">
              <h2 className="font-serif text-xl text-atlas-accent">Records: the biggest driving factor</h2>
              <p className="mt-3 text-sm text-white/75">
                The single most important factor in determining how quickly an aircraft can transition is
                the quality and accessibility of the aircraft records.
              </p>
              <ul className="mt-4 space-y-2">
                {recordsIssues.map((issue) => (
                  <li key={issue} className="text-sm text-white/70">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          </RevealOnScroll>
        ) : null}

        {timeline.length > 0 ? (
          <RevealOnScroll>
            <h2 className="font-serif text-2xl">Recommended transition timeline</h2>
            <div className="mt-8 space-y-6">
              {timeline.map((phase, i) => (
                <RevealOnScroll key={phase.phase} delayMs={i * 80}>
                  <div className="relative border-l-2 border-atlas-accent/40 pl-6 sm:pl-8">
                    <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-atlas-accent" />
                    <p className="text-xs uppercase tracking-wider text-atlas-accent">{phase.window}</p>
                    <h3 className="mt-1 font-serif text-xl">{phase.phase}</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {phase.ownerActions.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                            Owner
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {phase.ownerActions.map((a) => (
                              <li key={a} className="text-sm text-white/75">
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {phase.prismjetActions.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                            PrismJet
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {phase.prismjetActions.map((a) => (
                              <li key={a} className="text-sm text-white/75">
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </RevealOnScroll>
        ) : null}

        <RevealOnScroll>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="font-serif text-xl">FAA approvals — setting expectations</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Even with strong preparation, approval timing can vary depending on local FAA workload,
              aircraft complexity, and completeness of submissions. From time submitted to FAA, it can
              be 2–6 weeks before the aircraft is on the PrismJet 135 certificate.
            </p>
          </div>
        </RevealOnScroll>

        {ownerRecommendations.length > 0 ? (
          <RevealOnScroll>
            <h2 className="font-serif text-2xl">Owner recommendations</h2>
            <ul className="mt-4 space-y-2">
              {ownerRecommendations.map((r) => (
                <li key={r} className="text-sm text-white/75">
                  • {r}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        ) : null}

        {downtimeStrategies.length > 0 ? (
          <RevealOnScroll>
            <h2 className="font-serif text-2xl">Strategies to reduce downtime</h2>
            <ul className="mt-4 space-y-3">
              {downtimeStrategies.map((s) => (
                <li key={s} className="text-sm leading-relaxed text-white/75">
                  {s}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        ) : null}

        {explainerCards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {explainerCards.map((card, i) => (
              <RevealOnScroll key={card.title} delayMs={i * 80}>
                <div className="h-full rounded-xl border border-white/10 p-5">
                  <h3 className="font-serif text-lg text-atlas-accent">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{card.body}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        ) : null}

        <RevealOnScroll>
          <p className="max-w-3xl text-sm leading-relaxed text-white/60">
            Aircraft onboarding and conformity are complex processes involving multiple parties,
            regulatory coordination, and operational planning. PrismJet&apos;s role is to manage this
            process proactively, identify issues early, and position the aircraft for long-term
            operational success.
          </p>
        </RevealOnScroll>
      </ExperienceBody>
    </>
  );
}
