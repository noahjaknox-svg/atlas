"use client";

import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import type { AssumptionMap } from "@/lib/assumptions";
import { AircraftSetupBar } from "@/components/internal/workspace/aircraft-setup-panel";
import {
  aircraftAssumptionCategory,
  buildProfileFieldGroups,
  buildEconomicsFieldGroups,
  PROSPECT_EDITABLE_ASSUMPTIONS,
  filterEconomicsGroupsForModel,
  getAircraftCompleteness,
  normalizeUsageType,
  type AircraftCardMeta,
  type FieldGroup,
  type WorkspaceSectionId,
} from "@/lib/aircraft-workspace";
import type { WorkspaceField } from "@/lib/workspace-sections";
import { getMissingInfoCount } from "@/lib/required-fields";

type SectionRow = {
  id: string;
  sectionType: string;
  title: string;
  bodyCopy: string | null;
  visible: boolean;
  imageUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
};

type ScenarioSummary = {
  netAnnualCost: string | number | null;
  netMonthlyCost: string | number | null;
  costPerOwnerHour: string | number | null;
  ownerHours: string | number | null;
};

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: WorkspaceField;
  value: string;
  onChange: (v: string) => void;
}) {
  const cls =
    "w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 text-xs focus:border-atlas-accent focus:outline-none";

  if (field.type === "textarea") {
    return (
      <textarea className={cls} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <select className={cn(cls, "h-8")} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      className="h-8 border-atlas-border/80 bg-atlas-bg text-xs"
      type={field.type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FieldGrid({
  groups,
  assumptions,
  onAssumptionChange,
  collapsible,
}: {
  groups: FieldGroup[];
  assumptions: AssumptionMap;
  onAssumptionChange: (name: string, value: string) => void;
  collapsible?: boolean;
}) {
  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const body = (
          <div className="grid gap-2 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div
                key={field.key}
                className={cn("space-y-0.5", field.colSpan === 2 && "sm:col-span-2")}
              >
                <Label className="text-[9px] text-atlas-muted">
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                <FieldInput
                  field={field}
                  value={assumptions[field.assumptionName!] ?? ""}
                  onChange={(v) => onAssumptionChange(field.assumptionName!, v)}
                />
              </div>
            ))}
          </div>
        );
        if (collapsible) {
          return (
            <CollapsibleSection key={group.title} title={group.title} defaultOpen>
              {body}
            </CollapsibleSection>
          );
        }
        return (
          <div key={group.title} className="rounded-md border border-atlas-border/50 p-3">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function AircraftConfigPanel({
  aircraftId,
  assumptions,
  sections,
  scenario,
  clientEditable,
  onAssumptionChange,
  onClientEditableChange,
  onSectionsChange,
  onRecalculate,
  onApplySetupDefaults,
  section,
  proposalId,
  portalSlug,
  isAdmin,
  publishLoading,
  onPreview,
  onPublish,
  onClientPortal,
  onRegeneratePin,
  portalPin,
}: {
  aircraftId: string;
  meta: AircraftCardMeta;
  assumptions: AssumptionMap;
  status: string;
  sections: SectionRow[];
  scenario: ScenarioSummary | null;
  clientEditable: Record<string, boolean>;
  onAssumptionChange: (name: string, value: string) => void;
  onClientEditableChange: (name: string, value: boolean) => void;
  onSectionsChange: (sections: SectionRow[]) => void;
  onRecalculate: () => void;
  onApplySetupDefaults?: (
    patch: Partial<AssumptionMap>,
    instancePatch?: Record<string, unknown>
  ) => void;
  section: WorkspaceSectionId;
  proposalId: string;
  portalSlug: string | null;
  isAdmin: boolean;
  publishLoading: boolean;
  onPreview: () => void;
  onPublish: () => void;
  onClientPortal: () => void;
  onRegeneratePin?: () => void;
  portalPin?: string | null;
}) {
  const [missingOpen, setMissingOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const category = aircraftAssumptionCategory(aircraftId);
  const usageType = normalizeUsageType(assumptions);
  const profileGroups = buildProfileFieldGroups(category);
  const economicsGroups = filterEconomicsGroupsForModel(
    buildEconomicsFieldGroups(category),
    usageType
  );

  const { percent, missing } = getAircraftCompleteness(assumptions);
  const assumptionRows = Object.entries(assumptions).map(([assumptionName, value]) => ({
    assumptionName,
    value: String(value),
  }));
  const missingRequired = getMissingInfoCount(assumptionRows);
  const homeFuelPrice = parseFloat(String(assumptions.home_fuel_price ?? "0"));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-atlas-bg">
      {onApplySetupDefaults && (
        <AircraftSetupBar
          proposalId={proposalId}
          aircraftId={aircraftId}
          assumptions={assumptions}
          onApplyDefaults={onApplySetupDefaults}
        />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {section === "profile" && (
          <FieldGrid
            groups={profileGroups}
            assumptions={assumptions}
            onAssumptionChange={onAssumptionChange}
          />
        )}

        {section === "economics" && (
          <FieldGrid
            groups={economicsGroups}
            assumptions={assumptions}
            onAssumptionChange={onAssumptionChange}
            collapsible
          />
        )}

        {section === "proforma" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Annual summary" value={formatCurrency(scenario?.netAnnualCost != null ? Number(scenario.netAnnualCost) : null)} />
              <Metric label="Monthly summary" value={formatCurrency(scenario?.netMonthlyCost != null ? Number(scenario.netMonthlyCost) : null)} />
              <Metric label="Cost / owner hr" value={formatCurrency(scenario?.costPerOwnerHour != null ? Number(scenario.costPerOwnerHour) : null)} />
              <Metric label="Completeness" value={`${percent}%`} />
            </div>
            {missingRequired > 0 && (
              <button
                type="button"
                onClick={() => setMissingOpen((o) => !o)}
                className="rounded border border-amber-700/40 bg-amber-900/20 px-2 py-1 text-[10px] text-amber-200"
              >
                {missingRequired} required fields missing {missingOpen ? "▲" : "▼"}
              </button>
            )}
            {missingOpen && missing.length > 0 && (
              <ul className="flex flex-wrap gap-1 text-[10px] text-amber-200/90">
                {missing.map((m) => (
                  <li key={m} className="rounded bg-amber-900/25 px-1.5 py-0.5">
                    {m}
                  </li>
                ))}
              </ul>
            )}
            {homeFuelPrice <= 0 && (
              <p className="rounded border border-amber-700/40 bg-amber-900/20 px-2 py-1.5 text-xs text-amber-200">
                Home fuel price is $0 — fuel line items will be empty until you set home fuel in
                Economics or sync FBO prices in Data Hub.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" className="text-xs" onClick={onRecalculate}>
                Recalculate
              </Button>
              <Link
                href={ROUTES.aircraftManagement.proposalProForma(proposalId, aircraftId)}
                className="text-xs text-atlas-accent hover:underline"
              >
                Full P&amp;L view →
              </Link>
            </div>
            <CollapsibleSection title="Calculation details" defaultOpen={false}>
              <p className="text-xs text-atlas-muted">
                Drill-down line items are available in the full pro forma view. Recalculate after
                editing economics assumptions.
              </p>
              <button
                type="button"
                onClick={() => setDetailOpen((o) => !o)}
                className="mt-2 text-[10px] text-atlas-accent hover:underline"
              >
                {detailOpen ? "Hide" : "Show"} scenario inputs
              </button>
              {detailOpen && (
                <dl className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <dt className="text-atlas-muted">Owner hours</dt>
                    <dd>{assumptions.owner_annual_hours || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-atlas-muted">Usage</dt>
                    <dd>{usageType === "part_91_135" ? "Part 91 + 135" : "Part 91"}</dd>
                  </div>
                </dl>
              )}
            </CollapsibleSection>
          </div>
        )}

        {section === "output" && (
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="text-xs"
                disabled={!portalSlug}
                onClick={onPreview}
              >
                Preview
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  className="text-xs"
                  disabled={publishLoading}
                  onClick={onPublish}
                >
                  {publishLoading ? "Publishing…" : "Publish"}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs"
                disabled={!portalSlug}
                onClick={onClientPortal}
              >
                Prospect portal
              </Button>
            </div>

            {portalSlug && (
              <CollapsibleSection title="Prospect portal PIN" defaultOpen={false}>
                <p className="font-mono text-xs">{portalPin ? `PIN ${portalPin}` : "Published — PIN shown once at publish"}</p>
                {onRegeneratePin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2 text-xs"
                    onClick={onRegeneratePin}
                  >
                    Regenerate PIN
                  </Button>
                )}
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Prospect-editable assumptions" defaultOpen={false}>
              <ul className="space-y-2">
                {PROSPECT_EDITABLE_ASSUMPTIONS.map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-xs">
                    <span className="text-atlas-muted">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={clientEditable[item.name] ?? false}
                      onChange={(e) => onClientEditableChange(item.name, e.target.checked)}
                      className="h-3.5 w-3.5 accent-atlas-accent"
                    />
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="Proposal section copy" defaultOpen>
              <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                {sections.map((sec, index) => (
                  <div
                    key={sec.id}
                    className="rounded border border-atlas-border/50 bg-atlas-bg/60 p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase text-atlas-muted">
                        {sec.sectionType.replace(/_/g, " ")}
                      </span>
                      <label className="flex items-center gap-1 text-[9px]">
                        <input
                          type="checkbox"
                          checked={sec.visible}
                          onChange={(e) => {
                            const next = [...sections];
                            next[index] = { ...sec, visible: e.target.checked };
                            onSectionsChange(next);
                          }}
                          className="accent-atlas-accent"
                        />
                        Visible
                      </label>
                    </div>
                    <Input
                      value={sec.title}
                      onChange={(e) => {
                        const next = [...sections];
                        next[index] = { ...sec, title: e.target.value };
                        onSectionsChange(next);
                      }}
                      className="h-7 text-xs"
                    />
                    <textarea
                      value={sec.bodyCopy ?? ""}
                      onChange={(e) => {
                        const next = [...sections];
                        next[index] = { ...sec, bodyCopy: e.target.value };
                        onSectionsChange(next);
                      }}
                      rows={2}
                      className="w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1 text-xs"
                    />
                    <Input
                      value={sec.imageUrl ?? ""}
                      onChange={(e) => {
                        const next = [...sections];
                        next[index] = { ...sec, imageUrl: e.target.value || null };
                        onSectionsChange(next);
                      }}
                      placeholder="Image URL"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={sec.videoUrl ?? ""}
                      onChange={(e) => {
                        const next = [...sections];
                        next[index] = { ...sec, videoUrl: e.target.value || null };
                        onSectionsChange(next);
                      }}
                      placeholder="Video URL (mp4)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={sec.posterUrl ?? ""}
                      onChange={(e) => {
                        const next = [...sections];
                        next[index] = { ...sec, posterUrl: e.target.value || null };
                        onSectionsChange(next);
                      }}
                      placeholder="Video poster URL"
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-atlas-border/60 bg-atlas-surface/30 px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-atlas-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-atlas-accent">{value}</p>
    </div>
  );
}
