"use client";

import { useCountUp } from "./use-count-up";
import { useReveal } from "./use-reveal";

export function AboutStatRow({ slide = false }: { slide?: boolean }) {
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.25 });
  const years = useCountUp(100, shown, 1400);

  return (
    <div
      ref={ref}
      className={
        slide
          ? "flex shrink-0 justify-center border-y border-white/10 py-3 text-center"
          : "mt-14 flex justify-center border-y border-white/10 py-10 text-center"
      }
    >
      <div>
        <p
          className={
            slide
              ? "font-serif text-3xl text-atlas-accent sm:text-4xl"
              : "font-serif text-5xl text-atlas-accent sm:text-6xl"
          }
        >
          {Math.round(years)}+
        </p>
        <p
          className={
            slide
              ? "mt-1 text-[10px] uppercase tracking-[0.25em] text-white/55 sm:text-xs"
              : "mt-2 text-sm uppercase tracking-[0.25em] text-white/55"
          }
        >
          Years combined experience
        </p>
      </div>
    </div>
  );
}
