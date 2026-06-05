import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/client-portal-load";

export default async function LegacyAboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  redirect(`/${slug}/experience/about-us`);
}
