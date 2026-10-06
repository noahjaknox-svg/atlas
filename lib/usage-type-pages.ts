import { sectionNavSlug } from "@/lib/experience-page-slug";

/**
 * Portal pages ↔ usage types, edited from the usage type's side (Data Warehouse).
 * The master pages' `usageTypeIds` stay the single source of truth, with the
 * designer's convention: an empty list means the page applies to every usage type.
 */

export function pageAppliesToUsageType(pageUsageTypeIds: readonly string[], usageTypeId: string): boolean {
  return pageUsageTypeIds.length === 0 || pageUsageTypeIds.includes(usageTypeId);
}

/**
 * New `usageTypeIds` for a page after including/excluding one usage type.
 * Collapses back to [] when every type is selected. Returns null when the change
 * can't be expressed (excluding the only usage type would leave the page for none).
 */
export function setPageUsageType(
  pageUsageTypeIds: readonly string[],
  usageTypeId: string,
  include: boolean,
  allUsageTypeIds: readonly string[]
): string[] | null {
  const current = new Set(pageUsageTypeIds.length === 0 ? allUsageTypeIds : pageUsageTypeIds);
  if (include) current.add(usageTypeId);
  else current.delete(usageTypeId);
  const next = allUsageTypeIds.filter((id) => current.has(id));
  if (next.length === 0) return null;
  return next.length === allUsageTypeIds.length ? [] : next;
}

/** A proposal page's usage types, from the master page with the same nav slug ([] = all). */
export function resolveSectionUsageTypeIds(
  section: { sectionType: string; pageSlug?: string | null },
  bySlug: Map<string, string[]>
): string[] {
  return bySlug.get(sectionNavSlug(section)) ?? [];
}
