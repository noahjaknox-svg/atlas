import { redirect } from "next/navigation";
import {
  loadActivePortal,
  requirePortalSession,
  trackPortalView,
} from "@/lib/client-portal-load";
import { resolveExperienceSection, resolveExperienceSections } from "@/lib/experience-resolve";

/** Shared portal chrome data for ExperienceShell pages (experience + aircraft). */
export async function loadExperiencePortalLayout(slug: string) {
  await requirePortalSession(slug);
  const data = await loadActivePortal(slug);

  if (!data.payload) redirect(`/${slug}`);

  await trackPortalView(data.portal.id);

  const sections = resolveExperienceSections(data.payload);
  const disclaimer = resolveExperienceSection(data.payload, "disclaimer")?.bodyCopy ?? null;

  return {
    ...data,
    sections,
    disclaimer,
  };
}
