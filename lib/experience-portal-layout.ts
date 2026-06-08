import { redirect } from "next/navigation";
import {
  loadActivePortal,
  requirePortalSession,
  trackPortalView,
} from "@/lib/client-portal-load";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import { resolveExperienceSection, resolveExperienceSections } from "@/lib/experience-resolve";

/** Resolve experience sections using live master copy from Proposal Design. */
export async function resolvePortalExperienceSections(
  payload: Parameters<typeof resolveExperienceSections>[0]
) {
  const masterTemplates = await getExperienceMasterTemplates();
  return resolveExperienceSections(payload, masterTemplates);
}

export async function resolvePortalExperienceSection(
  payload: Parameters<typeof resolveExperienceSection>[0],
  sectionType: string
) {
  const masterTemplates = await getExperienceMasterTemplates();
  return resolveExperienceSection(payload, sectionType, masterTemplates);
}

/** Shared portal chrome data for ExperienceShell pages (experience + aircraft). */
export async function loadExperiencePortalLayout(slug: string) {
  await requirePortalSession(slug);
  const [data, masterTemplates] = await Promise.all([
    loadActivePortal(slug),
    getExperienceMasterTemplates(),
  ]);

  if (!data.payload) redirect(`/${slug}`);

  await trackPortalView(data.portal.id);

  const sections = resolveExperienceSections(data.payload, masterTemplates);
  const disclaimer =
    resolveExperienceSection(data.payload, "disclaimer", masterTemplates)?.bodyCopy ?? null;

  return {
    ...data,
    sections,
    disclaimer,
  };
}
