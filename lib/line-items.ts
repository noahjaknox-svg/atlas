import { prisma } from "@/lib/db";
import {
  LINE_CATALOG_ASSUMPTION_KEY,
  isCustomLineItemKey,
  normalizeLineCatalog,
  serializeLineCatalog,
  type CatalogLineItem,
} from "@/lib/line-item-catalog";

/** The live catalog: code built-ins with stored edits applied, plus custom items. */
export async function loadLineCatalog(): Promise<CatalogLineItem[]> {
  const rows = await prisma.lineItem.findMany();
  return normalizeLineCatalog(
    rows.map((r) => ({
      key: r.key,
      label: r.label,
      section: r.section,
      kind: r.kind,
      appliesTo: r.appliesTo ?? undefined,
      source: "aircraft_type",
      active: r.active,
      sortOrder: r.sortOrder,
    }))
  );
}

/**
 * Line-item assumptions for an aircraft type: the catalog copy the engine reads, and
 * each active custom item's value (`li_<slug>`). Built-in values come from the
 * AircraftType columns via loadAircraftTypeDefaults.
 */
export async function loadLineItemDefaults(aircraftTypeId: string): Promise<Record<string, string>> {
  const [catalog, values] = await Promise.all([
    loadLineCatalog(),
    prisma.aircraftTypeLineItemValue.findMany({
      where: { aircraftTypeId },
      include: { lineItem: { select: { key: true, active: true } } },
    }),
  ]);
  const out: Record<string, string> = {
    [LINE_CATALOG_ASSUMPTION_KEY]: serializeLineCatalog(catalog),
  };
  for (const v of values) {
    if (v.lineItem.active && isCustomLineItemKey(v.lineItem.key)) {
      out[v.lineItem.key] = String(Number(v.value));
    }
  }
  return out;
}
