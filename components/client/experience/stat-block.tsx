"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Runs before paint in the browser (no flash of the final value before counting),
// and is a no-op-safe effect during server rendering.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Split "100+" / "$2.4M" / "15%" into prefix, animatable number, and suffix. */
export function parseStatValue(value: string): {
  prefix: string;
  number: number | null;
  decimals: number;
  suffix: string;
} {
  const m = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/);
  if (!m) return { prefix: "", number: null, decimals: 0, suffix: value };
  const digits = m[2]!.replace(/,/g, "");
  const decimals = digits.includes(".") ? digits.split(".")[1]!.length : 0;
  return { prefix: m[1]!, number: Number(digits), decimals, suffix: m[3]! };
}

function formatStatNumber(n: number, decimals: number, grouped: boolean) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
}

/**
 * Highlighted figure, e.g. "100+" over "Years combined experience".
 *
 * Renders the final value first (server, no-JS, reduced motion, or browsers without
 * IntersectionObserver all see the real number); only when animation is actually
 * available does it reset to 0 before paint and count up once scrolled into view.
 */
export function StatBlock({
  value,
  label,
  countUp = true,
}: {
  value: string;
  label: string;
  countUp?: boolean;
}) {
  const parsed = parseStatValue(value);
  const target = parsed.number;
  const grouped = /\d,\d/.test(value);
  const ref = useRef<HTMLDivElement>(null);
  const [shownNumber, setShownNumber] = useState<number | null>(target);

  useIsomorphicLayoutEffect(() => {
    setShownNumber(target);
    if (!countUp || target == null) return;
    const el = ref.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduced || typeof IntersectionObserver === "undefined") return;

    setShownNumber(0);
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setShownNumber(target * (1 - Math.pow(1 - t, 3)));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, countUp]);

  const display =
    target == null || shownNumber == null
      ? value
      : `${parsed.prefix}${formatStatNumber(
          shownNumber === target ? target : Math.round(shownNumber * 10 ** parsed.decimals) / 10 ** parsed.decimals,
          parsed.decimals,
          grouped
        )}${parsed.suffix}`;

  return (
    <div ref={ref} className="flex justify-center border-y border-white/10 py-3 text-center">
      <div>
        {/* Screen readers always get the real value, not intermediate counts. */}
        <p className="font-serif text-3xl text-atlas-accent sm:text-4xl" aria-hidden>
          {display}
        </p>
        <span className="sr-only">{value}</span>
        {label ? (
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/55 sm:text-xs">
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}
