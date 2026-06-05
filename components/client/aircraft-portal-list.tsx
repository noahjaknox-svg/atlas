"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";

export function AircraftPortalList({
  slug,
  aircraft,
}: {
  slug: string;
  aircraft: AircraftSnapshotEntry[];
}) {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Your proposal</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Your aircraft</h1>
        <p className="mt-4 text-lg text-white/70">
          Explore each aircraft included in your PrismJet management proposal.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
        {aircraft.map((ac) => (
          <Link
            key={ac.id}
            href={`/${slug}/aircraft/${ac.id}`}
            className="group relative block min-h-[18rem] overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur transition-colors hover:border-atlas-accent/40 hover:bg-white/10"
          >
            <div className="absolute inset-0 overflow-hidden bg-[#0a0d14]">
              {ac.portalVideoUrl ? (
                <video
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={ac.portalImageUrl ?? undefined}
                >
                  <source src={ac.portalVideoUrl} type="video/mp4" />
                </video>
              ) : ac.portalImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ac.portalImageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02]">
                  <span className="font-serif text-2xl text-white/30">{ac.label}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14]/95 via-[#0a0d14]/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h2 className="font-serif text-2xl">{ac.label}</h2>
              {ac.tailNumber ? (
                <p className="mt-1 text-sm text-white/55">{ac.tailNumber}</p>
              ) : null}
              {ac.clientSummary ? (
                <p className="mt-3 line-clamp-2 text-sm text-white/70">{ac.clientSummary}</p>
              ) : null}
              <dl className="mt-4 flex flex-wrap gap-6">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/45">Est. annual</dt>
                  <dd className="mt-0.5 font-mono text-sm text-atlas-accent">
                    {formatCurrency(ac.metrics.netAnnualCost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-white/45">Owner hours</dt>
                  <dd className="mt-0.5 font-mono text-sm text-white/85">
                    {ac.metrics.ownerHours.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
