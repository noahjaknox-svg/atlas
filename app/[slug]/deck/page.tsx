import { redirect } from "next/navigation";
import { requirePortalSession, loadActivePortal } from "@/lib/client-portal-load";
import { resolveExperienceSections } from "@/lib/experience-resolve";
import { getFirstExperienceSlug } from "@/lib/experience-content";

/** Legacy deck URL — redirects to PrismJet Experience. */
export default async function LegacyDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  const { payload } = await loadActivePortal(slug);
  const sections = resolveExperienceSections(payload);
  redirect(`/${slug}/experience/${getFirstExperienceSlug(sections)}`);
}
