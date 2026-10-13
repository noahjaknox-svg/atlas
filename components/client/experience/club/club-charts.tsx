"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { ClubMonth } from "@/lib/club-proforma";
import { cn } from "@/lib/utils";
import { fmtUsd, fmtUsdCompact } from "./club-format";

const W = 720;
const H = 300;
const PAD = { l: 58, r: 18, t: 18, b: 34 };

function niceStep(range: number, ticks: number): number {
  const rough = range / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const n = rough / pow;
  const mult = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return mult * pow;
}

/** Cumulative cash by month, with aircraft acquisition markers and a hover read-out. */
export function CashChart({
  months,
  acquisitionMonths,
  lowPoint,
}: {
  months: ClubMonth[];
  acquisitionMonths: number[];
  lowPoint: { month: number; cumulative: number } | null;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const vals = months.map((m) => m.cumulative);
    const rawMin = Math.min(0, ...vals);
    const rawMax = Math.max(0, ...vals);
    const step = niceStep(Math.max(rawMax - rawMin, 1), 4);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step || step;
    const n = months.length;
    const x = (i: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r));
    const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
    const line = months.map((m, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(m.cumulative).toFixed(1)}`).join(" ");
    const area = `${line} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
    const grid: number[] = [];
    for (let v = min; v <= max + 1e-6; v += step) grid.push(v);
    return { min, max, x, y, line, area, grid, n };
  }, [months]);

  const zeroY = geo.y(0);
  const active = hover != null ? months[hover] : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (geo.n - 1));
    setHover(Math.max(0, Math.min(geo.n - 1, i)));
  }

  const yearMarks = months.filter((m) => m.month % 12 === 0);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label="Cumulative cash balance by month"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="club-pos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(74 222 128)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="rgb(74 222 128)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="club-neg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgb(251 113 133)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(251 113 133)" stopOpacity="0.04" />
          </linearGradient>
          <clipPath id="club-above">
            <rect x="0" y="0" width={W} height={zeroY} />
          </clipPath>
          <clipPath id="club-below">
            <rect x="0" y={zeroY} width={W} height={H - zeroY} />
          </clipPath>
        </defs>

        {geo.grid.map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={geo.y(v)}
              y2={geo.y(v)}
              stroke="white"
              strokeOpacity={v === 0 ? 0.35 : 0.08}
              strokeDasharray={v === 0 ? undefined : "3 5"}
            />
            <text x={PAD.l - 8} y={geo.y(v) + 4} textAnchor="end" className="fill-white/45 text-[10px]">
              {fmtUsdCompact(v)}
            </text>
          </g>
        ))}

        <motion.g
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: inView || reduced ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          <path d={geo.area} fill="url(#club-pos)" clipPath="url(#club-above)" />
          <path d={geo.area} fill="url(#club-neg)" clipPath="url(#club-below)" />
        </motion.g>

        {acquisitionMonths.map((m, i) => {
          const idx = Math.min(m, geo.n) - 1;
          if (idx < 0) return null;
          return (
            <g key={`${m}-${i}`}>
              <line
                x1={geo.x(idx)}
                x2={geo.x(idx)}
                y1={PAD.t}
                y2={H - PAD.b}
                stroke="rgb(74 222 128)"
                strokeOpacity="0.4"
                strokeDasharray="2 4"
              />
              <text x={geo.x(idx) + 5} y={PAD.t + 10} className="fill-emerald-300/80 text-[10px]">
                Aircraft {i + 1}
              </text>
            </g>
          );
        })}

        <motion.path
          d={geo.line}
          fill="none"
          stroke="rgb(74 222 128)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: inView || reduced ? 1 : 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {lowPoint && lowPoint.month <= geo.n ? (
          <g>
            <circle cx={geo.x(lowPoint.month - 1)} cy={geo.y(lowPoint.cumulative)} r={4.5} fill="rgb(251 113 133)" />
            <text
              x={geo.x(lowPoint.month - 1)}
              y={geo.y(lowPoint.cumulative) + 18}
              textAnchor="middle"
              className="fill-rose-300 text-[10px]"
            >
              Low point {fmtUsdCompact(lowPoint.cumulative)}
            </text>
          </g>
        ) : null}

        {yearMarks.map((m) => (
          <text
            key={m.month}
            x={geo.x(m.month - 1)}
            y={H - 10}
            textAnchor="middle"
            className="fill-white/45 text-[10px]"
          >
            Year {m.month / 12}
          </text>
        ))}

        {active ? (
          <g pointerEvents="none">
            <line
              x1={geo.x(hover!)}
              x2={geo.x(hover!)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="white"
              strokeOpacity="0.4"
            />
            <circle cx={geo.x(hover!)} cy={geo.y(active.cumulative)} r={5} fill="white" stroke="rgb(74 222 128)" strokeWidth={2} />
          </g>
        ) : null}
      </svg>

      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute left-3 top-2 rounded-lg border border-white/15 bg-[#0B0F1A]/90 px-3 py-2 text-xs shadow-lg transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        {active ? (
          <>
            <p className="font-semibold text-white">Month {active.month}</p>
            <p className="mt-0.5 text-white/60">
              {active.members} members · {active.fleet} aircraft
            </p>
            <p className={cn("mt-0.5 font-semibold tabular-nums", active.cumulative < 0 ? "text-rose-300" : "text-emerald-300")}>
              {fmtUsd(active.cumulative)}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Ring gauge: hours flown against the annual allocation. Turns amber past the allocation. */
export function HoursGauge({
  hours,
  allocation,
  maxHours,
}: {
  hours: number;
  allocation: number;
  maxHours: number;
}) {
  const reduced = useReducedMotion();
  const r = 62;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, hours / maxHours));
  const allocFrac = allocation / maxHours;
  const over = hours > allocation;
  const tickAngle = allocFrac * 360 - 90;
  const tx = 80 + (r + 9) * Math.cos((tickAngle * Math.PI) / 180);
  const ty = 80 + (r + 9) * Math.sin((tickAngle * Math.PI) / 180);
  const tx2 = 80 + (r - 9) * Math.cos((tickAngle * Math.PI) / 180);
  const ty2 = 80 + (r - 9) * Math.sin((tickAngle * Math.PI) / 180);

  return (
    <svg viewBox="0 0 160 160" className="h-auto w-full max-w-[200px]" role="img" aria-label={`${hours} of ${allocation} allocated hours`}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="10" />
      <motion.circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke={over ? "rgb(252 211 77)" : "rgb(74 222 128)"}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        transform="rotate(-90 80 80)"
        initial={false}
        animate={{ strokeDashoffset: c * (1 - frac) }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
      />
      <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="white" strokeOpacity="0.7" strokeWidth="2" />
      <text x="80" y="78" textAnchor="middle" className="fill-white text-[26px] font-semibold tabular-nums">
        {Math.round(hours)}
      </text>
      <text x="80" y="96" textAnchor="middle" className="fill-white/50 text-[9px] uppercase tracking-[0.14em]">
        hrs / {allocation} included
      </text>
    </svg>
  );
}

export type BarRow = {
  label: string;
  value: number;
  /** "in" = revenue, "out" = cost, "net" = result. */
  kind: "in" | "out" | "net";
  note?: string;
};

/** Horizontal revenue → cost → net bars that animate when values change. */
export function BarList({ rows, scale }: { rows: BarRow[]; scale: number }) {
  const reduced = useReducedMotion();
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = scale > 0 ? Math.max(0, Math.min(100, (Math.abs(row.value) / scale) * 100)) : 0;
        const color =
          row.kind === "in"
            ? "bg-emerald-400/80"
            : row.kind === "out"
              ? "bg-white/25"
              : row.value >= 0
                ? "bg-emerald-300"
                : "bg-rose-400";
        return (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn(row.kind === "net" ? "font-semibold text-white" : "text-white/70")}>
                {row.label}
                {row.note ? <span className="ml-2 text-xs text-white/40">{row.note}</span> : null}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  row.kind === "net" ? "font-semibold text-white" : "text-white/80"
                )}
              >
                {row.kind === "out" ? "−" : ""}
                {fmtUsd(Math.abs(row.value))}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className={cn("h-full rounded-full", color)}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
