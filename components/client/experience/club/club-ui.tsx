"use client";

import {
  LayoutGroup,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Shared look for every Silverleaf club view: one card, one eyebrow, one control style. */
export const clubText = {
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/85",
  title: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
  body: "text-sm leading-relaxed text-white/65",
  muted: "text-xs text-white/50",
  value: "font-semibold tabular-nums tracking-tight text-white",
} as const;

export function ClubCard({
  children,
  className,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "portal-element-panel relative overflow-hidden p-4 sm:p-6",
        glow && "ring-1 ring-emerald-400/30",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ClubHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className={clubText.eyebrow}>{eyebrow}</p> : null}
        <h3 className={cn(clubText.title, eyebrow && "mt-1.5")}>{title}</h3>
        {description ? <p className={cn(clubText.body, "mt-1.5 max-w-2xl")}>{description}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/** Number that tweens when its value changes, and (optionally) counts up once in view. */
export function AnimatedNumber({
  value,
  format,
  className,
  countUp = false,
  duration = 0.7,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  countUp?: boolean;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const fmt = useRef(format);
  fmt.current = format;
  const mv = useMotionValue(value);
  const [text, setText] = useState(() => format(value));
  const [armed, setArmed] = useState(!countUp);

  // Final value first (SSR / print / reduced motion); only reset to 0 when animation is available.
  useIsoLayoutEffect(() => {
    if (!countUp || reduced) return;
    mv.set(0);
    setText(fmt.current(0));
    setArmed(false);
  }, [countUp, reduced, mv]);

  useEffect(() => {
    if (countUp && !armed) {
      if (!inView) return;
      setArmed(true);
    }
    if (reduced) {
      mv.set(value);
      setText(fmt.current(value));
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, inView, armed, countUp, reduced, duration, mv]);

  useMotionValueEvent(mv, "change", (v) => setText(fmt.current(v)));

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  format,
  hint,
  tone = "default",
  countUp = false,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "warn";
  countUp?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-white";
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-emerald-400/30 hover:bg-white/[0.07]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.7rem]", toneClass)}>
        <AnimatedNumber value={value} format={format} countUp={countUp} />
      </p>
      {hint ? <p className="mt-1 text-xs text-white/45">{hint}</p> : null}
    </div>
  );
}

/** Pill segmented control with a sliding highlight. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: {
  options: { value: T; label: string; sublabel?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-white/10 bg-black/25 p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60",
                size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
                active ? "text-[#05140b]" : "text-white/65 hover:text-white"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="seg-pill"
                  className="absolute inset-0 rounded-full bg-emerald-400"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative z-10">{o.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display: string;
  hint?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const inputId = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.12em] text-white/55">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-white">{display}</span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-emerald-300/60",
          "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-200",
          "[&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(74,222,128,0.18)]",
          "[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110",
          "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-200 [&::-moz-range-thumb]:bg-emerald-400"
        )}
        style={{
          background: `linear-gradient(to right, rgb(74 222 128) ${pct}%, rgba(255,255,255,0.14) ${pct}%)`,
        }}
      />
      {hint ? <p className="mt-1.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "warn" ? "status" : undefined}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tone === "warn"
          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
          : "border-white/10 bg-white/[0.04] text-white/70"
      )}
    >
      {children}
    </div>
  );
}

export function ModelNote() {
  return (
    <p className="mt-4 text-[11px] leading-relaxed text-white/40">
      Modelled estimates for discussion, not commitments. Figures are illustrative, depend on the
      assumptions shown, and are not a guarantee of results.
    </p>
  );
}
