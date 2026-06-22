"use client";

import { cn } from "@/lib/utils";
import { getAircraftDisplayName, type AircraftCardMeta } from "@/lib/aircraft-workspace";
import type { AssumptionMap } from "@/lib/assumptions";
import type { AircraftListItem } from "./aircraft-list-panel";
import { AircraftChipActionsMenu } from "./aircraft-chip-actions-menu";

export function WorkspaceAircraftRail({
  aircraft,
  selectedId,
  assumptionsByAircraft,
  onSelect,
  onAdd,
  onToggleIncluded,
  onRemove,
  onDuplicate,
  onRefreshWarehouse,
  readOnly = false,
}: {
  aircraft: AircraftListItem[];
  selectedId: string | null;
  assumptionsByAircraft: Record<string, AssumptionMap>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onToggleIncluded: (id: string, included: boolean) => void;
  onRemove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRefreshWarehouse?: (id: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="shrink-0 border-b border-atlas-border bg-atlas-surface/60">
      <div className="flex min-h-[3.25rem] items-stretch gap-2 px-3 py-2">
        {!readOnly ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex shrink-0 items-center gap-1.5 self-center rounded-md border border-dashed border-atlas-border px-3 py-2 text-sm font-medium text-atlas-accent transition-colors hover:border-atlas-accent hover:bg-atlas-accent/5"
          >
            <span className="text-base leading-none">+</span>
            Add aircraft
          </button>
        ) : null}

        {aircraft.length === 0 ? (
          <p className="flex shrink-0 items-center self-center atlas-caption px-2">
            No aircraft on this proposal
          </p>
        ) : null}

        <ul className="flex min-w-0 flex-1 items-stretch gap-2 overflow-x-auto pb-0.5">
          {aircraft.map((ac) => {
            const map = assumptionsByAircraft[ac.id] ?? ac.assumptions;
            const type = getAircraftDisplayName(map, ac as AircraftCardMeta);
            const base = map.home_airport_icao || ac.proposedHomeBaseIcao || "—";
            const included = ac.includedOnProposal !== false;
            const selected = selectedId === ac.id;

            return (
              <li
                key={ac.id}
                className={cn(
                  "group/chip flex shrink-0 rounded-md border transition-colors",
                  selected
                    ? "border-atlas-accent bg-atlas-accent/5 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.3)]"
                    : "border-atlas-border/40 hover:border-atlas-border",
                  !included && "opacity-50"
                )}
              >
                <div className="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3">
                  <button
                    type="button"
                    onClick={() => onSelect(ac.id)}
                    className="min-w-[8.5rem] max-w-[14rem] text-left"
                  >
                    <p className="truncate text-sm font-medium text-atlas-text">{type}</p>
                    <p className="atlas-caption truncate">{base}</p>
                  </button>
                  <label
                    className="flex shrink-0 flex-col items-center gap-0.5 border-l border-atlas-border/50 pl-2"
                    title="On proposal"
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      disabled={readOnly}
                      onChange={(e) => onToggleIncluded(ac.id, e.target.checked)}
                      className="h-3.5 w-3.5 accent-atlas-accent disabled:opacity-50"
                    />
                    <span className="atlas-caption text-[10px]">Show</span>
                  </label>
                  {!readOnly ? (
                    <AircraftChipActionsMenu
                      onDuplicate={onDuplicate ? () => onDuplicate(ac.id) : undefined}
                      onRefreshWarehouse={
                        onRefreshWarehouse ? () => onRefreshWarehouse(ac.id) : undefined
                      }
                      onRemove={onRemove ? () => onRemove(ac.id) : undefined}
                      triggerClassName="opacity-70 group-hover/chip:opacity-100 data-[open]:opacity-100"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
