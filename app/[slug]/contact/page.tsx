import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/client-portal-load";

export default async function LegacyContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  redirect(`/${slug}/experience/sales-acquisitions`);
}
