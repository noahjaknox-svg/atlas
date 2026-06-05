import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/client-portal-load";

/** Legacy section URLs redirect into the presentation deck. */
export default async function ClientSectionRedirectPage({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  redirect(`/${slug}/deck`);
}
