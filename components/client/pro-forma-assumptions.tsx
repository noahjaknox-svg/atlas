"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProFormaAssumptionUsedItem } from "@/lib/proforma-statement";

export function ProFormaAssumptionsList({
  items,
  defaultOpen = false,
  className,
}: {
  items: ProFormaAssumptionUsedItem[];
  /** When false (default), the list is collapsed. */
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-white/15 bg-white/5",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/70 transition-colors hover:text-white"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-atlas-accent">
          Assumptions
        </span>
        <span className="text-[11px] normal-case tracking-normal text-white/45">
          (off statement)
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-white/40">{items.length}</span>
      </button>
      {open ? (
        <dl className="space-y-2 border-t border-white/10 px-4 py-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start gap-x-3 gap-y-0.5"
            >
              <dt className="text-sm leading-snug text-white/60">{item.label}</dt>
              <dd className="break-all text-right font-mono text-sm tabular-nums text-white">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
