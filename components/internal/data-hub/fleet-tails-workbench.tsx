"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AircraftTailEditor,
  type TailSection,
} from "@/components/internal/data-hub/aircraft-tail-editor";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

type FleetListRow = {
  id: string;
  tailNumber: string;
  aircraftTypeId: string;
  aircraftTypeCode: string;
  status: string;
};

type TypeOption = {
  id: string;
  code: string;
  manufacturer: string;
  model: string;
};

const FIELD_CONTROL = cn(
  "flex h-10 w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm text-atlas-text",
  "placeholder:text-atlas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
);

function normalizeTailSection(raw: string | null): TailSection {
  if (raw?.toLowerCase() === "operating") return "Operating";
  return "Identity";
}

export function FleetTailsWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fleet, setFleet] = useState<FleetListRow[]>([]);
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [selectedTailId, setSelectedTailId] = useState<string | null>(null);
  const [creatingTail, setCreatingTail] = useState(false);
  const [search, setSearch] = useState("");
  const [tailSection, setTailSection] = useState<TailSection>("Identity");
  const appliedFocus = useRef(false);

  const syncUrl = useCallback(
    (opts: { tailId?: string | null; section?: string | null; clearEntity?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "tails");
      params.delete("typeId");
      if (opts.clearEntity) {
        params.delete("tailId");
        params.delete("section");
      } else if (opts.tailId) {
        params.set("tailId", opts.tailId);
        if (opts.section) params.set("section", opts.section);
      }
      if (opts.section && !opts.clearEntity) params.set("section", opts.section);
      router.replace(`${ROUTES.dataWarehouse.data}?${params.toString()}`);
    },
    [router, searchParams]
  );

  const loadFleet = useCallback(async () => {
    const res = await fetch("/api/data/crew-fleet");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data?.rows)) setFleet(data.rows as FleetListRow[]);
  }, []);

  const loadTypes = useCallback(async () => {
    const res = await fetch("/api/data/aircraft?limit=500");
    if (!res.ok) return;
    const data = await res.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    setTypes(
      rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        code: String(r.code ?? ""),
        manufacturer: String(r.manufacturer ?? ""),
        model: String(r.model ?? ""),
      }))
    );
  }, []);

  useEffect(() => {
    void loadFleet();
    void loadTypes();
  }, [loadFleet, loadTypes]);

  function selectTailRow(id: string, section?: TailSection) {
    setCreatingTail(false);
    setSelectedTailId(id);
    const sec = section ?? tailSection;
    setTailSection(sec);
    syncUrl({ tailId: id, section: sec });
  }

  function startCreateTail() {
    setCreatingTail(true);
    setSelectedTailId(null);
    setTailSection("Identity");
    syncUrl({ clearEntity: true, section: "Identity" });
  }

  useEffect(() => {
    if (appliedFocus.current) return;
    const tailId = searchParams.get("tailId");
    const section = searchParams.get("section");
    if (!tailId) return;
    appliedFocus.current = true;
    selectTailRow(tailId, normalizeTailSection(section));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const visibleFleet = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fleet;
    return fleet.filter(
      (r) =>
        r.tailNumber.toLowerCase().includes(q) ||
        r.aircraftTypeCode.toLowerCase().includes(q)
    );
  }, [fleet, search]);

  function changeTailSection(sec: TailSection) {
    setTailSection(sec);
    if (selectedTailId) syncUrl({ tailId: selectedTailId, section: sec });
  }

  const editing = creatingTail || selectedTailId != null;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="data-hub-sidebar flex min-h-0 w-72 shrink-0 flex-col border-r border-atlas-border bg-atlas-chrome/95 xl:w-80">
        <div className="shrink-0 space-y-2 border-b border-atlas-border px-3 py-3">
          <input
            placeholder="Search tails…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={FIELD_CONTROL}
          />
          <Button className="w-full" onClick={startCreateTail} disabled={types.length === 0}>
            + Add tail
          </Button>
          {types.length === 0 ? (
            <p className="text-xs text-atlas-muted">
              Add an aircraft type first on the Aircraft types tab.
            </p>
          ) : null}
        </div>
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {visibleFleet.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-atlas-muted">No tails yet.</p>
          ) : (
            <nav className="space-y-0.5" aria-label="Fleet tails">
              {visibleFleet.map((row) => {
                const active = !creatingTail && row.id === selectedTailId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => selectTailRow(row.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                        : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono">{row.tailNumber}</span>
                    <span className="shrink-0 text-[10px] text-atlas-muted">
                      {row.aircraftTypeCode}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {editing ? (
          <AircraftTailEditor
            tailId={selectedTailId}
            creating={creatingTail}
            types={types}
            section={tailSection}
            onSectionChange={changeTailSection}
            onSaved={async (id) => {
              await loadFleet();
              setCreatingTail(false);
              setSelectedTailId(id);
              syncUrl({ tailId: id, section: tailSection });
            }}
            onDeleted={async () => {
              setSelectedTailId(null);
              setCreatingTail(false);
              syncUrl({ clearEntity: true });
              await loadFleet();
            }}
            onCancelCreate={() => {
              setCreatingTail(false);
              syncUrl({ clearEntity: true });
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-atlas-muted">
            Select a tail from the list, or add a new one.
          </div>
        )}
      </div>
    </div>
  );
}
