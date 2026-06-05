"use client";

import { useEffect, useRef, useState } from "react";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";

function PaybackDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setAnimate(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setAnimate(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <p className="text-center text-xs uppercase tracking-wider text-white/50">Charter payback</p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-white/70">Other companies pay</p>
          <p className="mt-1 text-xs text-white/45">Wheels up → wheels down (flight time)</p>
          <div className="mt-4 h-8 rounded bg-white/10">
            <div
              className="h-full rounded bg-white/25 transition-all duration-1000 ease-out"
              style={{ width: animate ? "72%" : "0%" }}
            />
          </div>
          <p className="mt-2 font-mono text-sm text-white/60">200h flight time</p>
        </div>
        <div>
          <p className="text-sm font-medium text-atlas-accent">PrismJet pays</p>
          <p className="mt-1 text-xs text-white/45">Taxi to taxi (block time)</p>
          <div className="mt-4 h-8 rounded bg-atlas-accent/20">
            <div
              className="h-full rounded bg-atlas-accent transition-all duration-1000 ease-out delay-300"
              style={{ width: animate ? "100%" : "0%" }}
            />
          </div>
          <p className="mt-2 font-mono text-sm text-atlas-accent">230h block time paid out</p>
        </div>
      </div>
      <p className="mt-6 text-center text-[11px] text-white/40">
        Example: 200h flight time = 230h block time paid out. Exact numbers are estimates.
      </p>
    </div>
  );
}

export function AircraftCharterPage({
  section,
  branding,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const quote = section.contentBlocks?.quote;
  const bullets = section.contentBlocks?.introBullets ?? [];

  return (
    <>
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll>
          <SectionNumber n="03" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        {quote ? (
          <RevealOnScroll>
            <blockquote className="mx-auto max-w-3xl border-l-4 border-atlas-accent pl-6 font-serif text-2xl leading-snug text-white/90 sm:text-3xl">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
          </RevealOnScroll>
        ) : null}
        <RevealOnScroll delayMs={100}>
          <p className="mx-auto mt-8 max-w-3xl text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        {bullets.length > 0 ? (
          <RevealOnScroll delayMs={150}>
            <ul className="mx-auto mt-8 max-w-2xl space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-white/75">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-atlas-accent" />
                  {b}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        ) : null}
        <RevealOnScroll delayMs={200}>
          <PaybackDiagram />
        </RevealOnScroll>
      </ExperienceBody>
    </>
  );
}
