"use client";

import { useCountUp } from "./use-count-up";
import { useReveal } from "./use-reveal";

/** Default block-to-flight factor (mirrors lib/proforma-utilization DEFAULT_BLOCK_TO_FLIGHT_FACTOR). */
const DEFAULT_FACTOR = 1.13;

/**
 * Premium animation contrasting flight time (what others pay) with block time
 * (what PrismJet pays). Uses the proposal's charter hours when available, and
 * falls back to a representative example.
 */
export function BlockVsFlightAnimation({
  flightHours,
  blockHours,
  slide = false,
}: {
  flightHours?: number | null;
  blockHours?: number | null;
  slide?: boolean;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.3 });

  const hasData = !!flightHours && flightHours > 0;
  const flight = hasData ? Math.round(flightHours!) : 200;
  const block =
    hasData && blockHours && blockHours > 0
      ? Math.round(blockHours!)
      : Math.round(flight * DEFAULT_FACTOR);

  const deltaHours = Math.max(0, block - flight);
  const deltaPct = flight > 0 ? Math.round((deltaHours / flight) * 100) : 0;

  // Bars are sized relative to block time (the larger figure).
  const flightPct = block > 0 ? Math.round((flight / block) * 100) : 72;

  const flightCount = useCountUp(flight, shown);
  const blockCount = useCountUp(block, shown);

  return (
    <div
      ref={ref}
      className={
        slide
          ? "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-3 sm:p-4"
          : "overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-10"
      }
    >
      <p className="text-center text-[10px] uppercase tracking-[0.35em] text-white/50 sm:text-xs">
        Charter payback
      </p>
      <p
        className={
          slide
            ? "mx-auto mt-1 max-w-xl text-center text-xs text-white/60"
            : "mx-auto mt-3 max-w-xl text-center text-sm text-white/60"
        }
      >
        Most operators compensate owners only for wheels-up flight time. PrismJet pays on block
        time — taxi to taxi — so more of every trip is paid back to you.
      </p>

      <div className={slide ? "mt-3 min-h-0 flex-1 space-y-3" : "mt-10 space-y-8"}>
        {/* Flight time (others) */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-white/70">Other companies pay</p>
            <p className="font-mono text-sm text-white/55">
              {Math.round(flightCount).toLocaleString()}h
            </p>
          </div>
          <p className="mt-0.5 text-xs text-white/40">Wheels up → wheels down (flight time)</p>
          <div className="mt-2 h-6 overflow-hidden rounded-lg bg-white/[0.06] sm:mt-3 sm:h-9">
            <div
              className="h-full rounded-lg bg-white/20 transition-[width] duration-1000 ease-out"
              style={{ width: shown ? `${flightPct}%` : "0%" }}
            />
          </div>
        </div>

        {/* Block time (PrismJet) */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-atlas-accent">PrismJet pays</p>
            <p className="font-mono text-sm text-atlas-accent">
              {Math.round(blockCount).toLocaleString()}h
            </p>
          </div>
          <p className="mt-0.5 text-xs text-white/40">Taxi to taxi (block time)</p>
          <div className="mt-2 h-6 overflow-hidden rounded-lg bg-atlas-accent/15 sm:mt-3 sm:h-9">
            <div
              className="h-full rounded-lg bg-gradient-to-r from-atlas-accent/80 to-atlas-accent transition-[width] duration-1000 ease-out"
              style={{ width: shown ? "100%" : "0%", transitionDelay: "250ms" }}
            />
          </div>
        </div>
      </div>

      {deltaHours > 0 ? (
        <div
          className={
            slide
              ? "mt-2 flex shrink-0 flex-col items-center gap-0.5 border-t border-white/10 pt-2 text-center"
              : "mt-10 flex flex-col items-center gap-1 border-t border-white/10 pt-6 text-center"
          }
        >
          <p className={slide ? "font-serif text-xl text-atlas-accent sm:text-2xl" : "font-serif text-3xl text-atlas-accent"}>
            +{deltaHours.toLocaleString()} hours
          </p>
          <p className={slide ? "text-xs text-white/60" : "text-sm text-white/60"}>
            paid back to you{deltaPct > 0 ? ` — about ${deltaPct}% more than flight-time models` : ""}
          </p>
        </div>
      ) : null}

      <p className={slide ? "mt-1 shrink-0 text-center text-[10px] text-white/40" : "mt-6 text-center text-[11px] text-white/40"}>
        {hasData
          ? "Based on this proposal's estimated charter utilization. Exact figures vary with demand."
          : "Illustrative example. Actual block vs flight time varies with routing and demand."}
      </p>
    </div>
  );
}
