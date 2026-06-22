import { redirect } from "next/navigation";
import { requirePortalSession, loadActivePortal } from "@/lib/client-portal-load";
import { resolvePortalExperienceSections } from "@/lib/experience-portal-layout";
import { getFirstExperienceSlug } from "@/lib/experience-content";

export default async function ExperienceIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { slug } = await params;
  const { draft } = await searchParams;

  // Draft preview is staff-only and enforced by the [page] route; jump straight in.
  if (draft === "1") redirect(`/${slug}/experience/welcome?draft=1`);

  await requirePortalSession(slug);
  const { payload } = await loadActivePortal(slug);
  const sections = await resolvePortalExperienceSections(payload);
  redirect(`/${slug}/experience/${getFirstExperienceSlug(sections)}`);
}
