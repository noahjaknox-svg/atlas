import { redirect } from "next/navigation";
import {
  loadActivePortal,
  requirePortalSession,
  trackPortalView,
} from "@/lib/client-portal-load";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import {
  isFrozenSnapshot,
  resolveExperienceSection,
  resolveExperienceSections,
  resolveFrozenSections,
} from "@/lib/experience-resolve";

/**
 * Resolve experience sections for a published portal.
 *
 * Frozen snapshots (renderSchemaVersion >= 1) render verbatim — no live master
 * copy is fetched or merged, so the proposal stays exactly as published until it
 * is republished. Legacy snapshots fall back to merging the live master copy.
 */
export async function resolvePortalExperienceSections(
  payload: Parameters<typeof resolveExperienceSections>[0]
) {
  if (isFrozenSnapshot(payload)) return resolveFrozenSections(payload);
  const masterTemplates = await getExperienceMasterTemplates();
  return resolveExperienceSections(payload, masterTemplates);
}

export async function resolvePortalExperienceSection(
  payload: Parameters<typeof resolveExperienceSection>[0],
  sectionType: string
) {
  if (isFrozenSnapshot(payload)) {
    return resolveFrozenSections(payload).find((s) => s.sectionType === sectionType) ?? null;
  }
  const masterTemplates = await getExperienceMasterTemplates();
  return resolveExperienceSection(payload, sectionType, masterTemplates);
}

/** Shared portal chrome data for ExperienceShell pages (experience + aircraft). */
export async function loadExperiencePortalLayout(slug: string) {
  await requirePortalSession(slug);
  const data = await loadActivePortal(slug);

  if (!data.payload) redirect(`/${slug}`);

  await trackPortalView(data.portal.id);

  let sections: ReturnType<typeof resolveExperienceSections>;
  let disclaimer: string | null;

  if (isFrozenSnapshot(data.payload)) {
    sections = resolveFrozenSections(data.payload);
    disclaimer = sections.find((s) => s.sectionType === "disclaimer")?.bodyCopy ?? null;
  } else {
    const masterTemplates = await getExperienceMasterTemplates();
    sections = resolveExperienceSections(data.payload, masterTemplates);
    disclaimer =
      resolveExperienceSection(data.payload, "disclaimer", masterTemplates)?.bodyCopy ?? null;
  }

  return {
    ...data,
    sections,
    disclaimer,
  };
}
