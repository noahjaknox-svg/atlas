"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import type { LineItemWire } from "@/lib/line-item-api";
import { COST_OVERRIDE_LINES, type CostOverrides } from "@/lib/cost-overrides";
import {
  lineSource,
  SECTION_TAB,
  type LineSource,
  type TypeSection,
} from "@/lib/aircraft-type-line-sources";

type CatalogSection = LineItemWire["section"];

const BADGE: Record<LineSource["kind"], { label: string; className: string }> = {
  set_here: { label: "Set here", className: "bg-atlas-accent/15 text-atlas-accent" },
  company: { label: "Company default", className: "bg-sky-500/15 text-sky-600" },
  fbo: { label: "FBO", className: "bg-emerald-500/15 text-emerald-600" },
  calculated: { label: "Calculated", className: "bg-atlas-border/40 text-atlas-muted" },
};

function SourceBadge({ kind }: { kind: LineSource["kind"] }) {
  const b = BADGE[kind];
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", b.className)}>
      {b.label}
    </span>
  );
}

function money(raw: string | undefined): string | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : null;
}

function percent(raw: string | undefined): string | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? `${n}%` : null;
}

/** One company-owned line: the inherited value, and an optional per-type override. */
function OverrideControls({
  line,
  defaults,
  overrides,
  onChange,
}: {
  line: (typeof COST_OVERRIDE_LINES)[number]["line"];
  defaults: Record<string, string>;
  overrides: CostOverrides;
  onChange: (next: CostOverrides) => void;
}) {
  const set = (key: keyof CostOverrides, value: string) => {
    const next = { ...overrides };
    if (value === "") delete next[key];
    else next[key] = value;
    onChange(next);
  };
  const clear = (...keys: (keyof CostOverrides)[]) => {
    const next = { ...overrides };
    for (const k of keys) delete next[k];
    onChange(next);
  };

  if (line === "insurance") {
    const mode = overrides.insurance_mode ?? "";
    const defaultMode = defaults.insurance_mode === "percent_hull" ? "percent_hull" : "annual";
    const defaultText =
      defaultMode === "percent_hull"
        ? `${percent(defaults.insurance_premium_percent) ?? "—"} of aircraft cost`
        : `${money(defaults.insurance_annual) ?? "—"}/yr`;
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-atlas-muted">Company default: {defaultText}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            aria-label="Insurance override for this aircraft type"
            value={mode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") clear("insurance_mode", "insurance_annual", "insurance_premium_percent");
              else set("insurance_mode", v);
            }}
            className="atlas-input h-10 w-full text-sm"
          >
            <option value="">Inherit company default</option>
            <option value="annual">Override: flat $/yr</option>
            <option value="percent_hull">Override: % of aircraft cost</option>
          </select>
          {mode === "annual" ? (
            <Input
              type="number"
              min={0}
              aria-label="Insurance annual override"
              placeholder="Annual premium ($)"
              value={overrides.insurance_annual ?? ""}
              onChange={(e) => set("insurance_annual", e.target.value)}
            />
          ) : null}
          {mode === "percent_hull" ? (
            <Input
              type="number"
              min={0}
              step="0.01"
              aria-label="Insurance percent override"
              placeholder="Premium (% of aircraft cost)"
              value={overrides.insurance_premium_percent ?? ""}
              onChange={(e) => set("insurance_premium_percent", e.target.value)}
            />
          ) : null}
        </div>
      </div>
    );
  }

  const key = line === "registration" ? "registration_tax_rate" : line;
  const defaultText = key === "registration_tax_rate" ? percent(defaults[key]) : money(defaults[key]);
  const label = COST_OVERRIDE_LINES.find((l) => l.line === line)!.label;
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-atlas-muted">
        Company default: {defaultText ?? "—"}
        {key === "registration_tax_rate" ? " of aircraft cost" : "/yr"}
      </p>
      <Input
        type="number"
        min={0}
        step={key === "registration_tax_rate" ? "0.01" : "1"}
        aria-label={`${label} override`}
        placeholder={`Override (blank = inherit${defaultText ? ` ${defaultText}` : ""})`}
        value={overrides[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );
}

function sourceLink(src: LineSource, onSelectSection: (s: TypeSection) => void): ReactNode {
  if (src.kind === "company" || src.kind === "fbo") {
    const section = src.kind === "company" && src.href.section ? `&section=${src.href.section}` : "";
    return (
      <a href={`${ROUTES.dataWarehouse.data}?tab=${src.href.tab}${section}`} className="text-atlas-accent hover:underline">
        Edit
      </a>
    );
  }
  if (src.kind === "calculated" && src.section) {
    return (
      <button type="button" onClick={() => onSelectSection(src.section!)} className="text-atlas-accent hover:underline">
        Go to {src.section}
      </button>
    );
  }
  return null;
}

/**
 * Lines for one pro forma section on an aircraft type tab. Values entered on the type
 * come first ("Set here"); everything the pro forma uses but that lives elsewhere is
 * listed with its source, so nothing is entered twice.
 */
export function AircraftTypeExpenseLines({
  section,
  catalog,
  defaults,
  costOverrides,
  onCostOverridesChange,
  renderSetHere,
  onSelectSection,
}: {
  section: CatalogSection;
  catalog: readonly LineItemWire[];
  defaults: Record<string, string>;
  costOverrides: CostOverrides;
  onCostOverridesChange: (next: CostOverrides) => void;
  renderSetHere: (item: LineItemWire, fieldKey: string | undefined) => ReactNode;
  onSelectSection: (section: TypeSection) => void;
}) {
  const items = catalog.filter((i) => i.active && i.section === section);
  const entries = items.map((item) => ({ item, src: lineSource(item) }));
  const setHere = entries.filter((e) => e.src.kind === "set_here");
  const inherited = entries.filter((e) => e.src.kind !== "set_here");
  const tab: TypeSection = SECTION_TAB[section];

  return (
    <div className="flex flex-col gap-6" data-testid={`expense-lines-${tab}`}>
      {setHere.length > 0 ? (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-atlas-muted/90">
            Set on this aircraft type <SourceBadge kind="set_here" />
          </h4>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {setHere.map(({ item, src }) => (
              <div key={item.key}>{renderSetHere(item, src.kind === "set_here" ? src.fieldKey : undefined)}</div>
            ))}
          </div>
        </div>
      ) : null}

      {inherited.length > 0 ? (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-atlas-muted/90">
            From elsewhere (not entered twice)
          </h4>
          <ul className="divide-y divide-atlas-border/40 rounded-md border border-atlas-border/60" aria-label={`${tab} sources`}>
            {inherited.map(({ item, src }) => (
              <li key={item.key} className="px-3 py-2.5" data-line={item.key}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 text-sm text-atlas-text">{item.label}</span>
                  <SourceBadge kind={src.kind} />
                  {src.kind !== "set_here" ? (
                    <span className="text-xs text-atlas-muted">{src.note}</span>
                  ) : null}
                  <span className="text-xs">{sourceLink(src, onSelectSection)}</span>
                </div>
                {src.kind === "company" && src.overrideLine ? (
                  <OverrideControls
                    line={src.overrideLine}
                    defaults={defaults}
                    overrides={costOverrides}
                    onChange={onCostOverridesChange}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
