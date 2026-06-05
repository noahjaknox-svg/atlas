"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";

export function AircraftPortalDetail({
  slug,
  aircraft,
  showBackToList,
}: {
  slug: string;
  aircraft: AircraftSnapshotEntry;
  showBackToList?: boolean;
}) {
  const heroImage = aircraft.portalImageUrl;
  const heroVideo = aircraft.portalVideoUrl;

  return (
    <div className="space-y-10">
      {showBackToList ? (
        <Link
          href={`/${slug}/aircraft`}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All aircraft
        </Link>
      ) : null}

      <div className="relative overflow-hidden rounded-xl border border-white/15">
        <div className="aspect-[21/9] max-h-[32rem] w-full bg-[#0a0d14]">
          {heroVideo ? (
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster={heroImage ?? undefined}
            >
              <source src={heroVideo} type="video/mp4" />
            </video>
          ) : heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[16rem] items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
              <span className="font-serif text-3xl text-white/25">{aircraft.label}</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-[#0a0d14]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Your aircraft</p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{aircraft.label}</h1>
          <p className="mt-2 text-white/60">
            {[aircraft.tailNumber, aircraft.year ? String(aircraft.year) : null, aircraft.proposedHomeBase]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {aircraft.clientSummary ? (
        <p className="max-w-3xl text-lg leading-relaxed text-white/85">{aircraft.clientSummary}</p>
      ) : null}

      {aircraft.portalSpecHighlights.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {aircraft.portalSpecHighlights.map((spec) => (
            <li
              key={spec}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-white/80"
            >
              {spec}
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Est. annual cost" value={formatCurrency(aircraft.metrics.netAnnualCost)} />
        <MetricCard
          label="Monthly equivalent"
          value={formatCurrency(aircraft.metrics.netMonthlyCost)}
        />
        <MetricCard
          label="Cost per owner hour"
          value={formatCurrency(aircraft.metrics.costPerOwnerHour)}
        />
        <MetricCard
          label="Charter revenue offset"
          value={formatCurrency(aircraft.metrics.charterRevenueOffset)}
        />
      </dl>

      <div className="flex flex-wrap gap-4 pt-2">
        <Link
          href={`/${slug}/pro-forma?aircraft=${aircraft.id}`}
          className="rounded-lg bg-atlas-accent px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#0a0d14] transition-colors hover:bg-atlas-accent-hover"
        >
          View pro forma
        </Link>
        <Link
          href={`/${slug}/contact`}
          className="rounded-lg border border-white/30 px-8 py-3 text-sm transition-colors hover:bg-white/10"
        >
          Contact your advisor
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-4 backdrop-blur">
      <dt className="text-[10px] uppercase tracking-wider text-white/50">{label}</dt>
      <dd className="mt-2 font-mono text-xl tabular-nums text-white">{value}</dd>
    </div>
  );
}
