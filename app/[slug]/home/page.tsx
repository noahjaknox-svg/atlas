import { requirePortalSession } from "@/lib/client-portal-load";
import { redirect } from "next/navigation";

/** Legacy overview URL — presentation deck is the primary entry after PIN. */
export default async function ClientHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  redirect(`/${slug}/deck`);
}
