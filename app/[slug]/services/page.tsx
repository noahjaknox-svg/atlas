import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/client-portal-load";

export default async function LegacyServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  redirect(`/${slug}/experience/aircraft-management`);
}
