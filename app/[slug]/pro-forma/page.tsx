import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/client-portal-load";

export default async function LegacyProFormaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aircraft?: string }>;
}) {
  const { slug } = await params;
  const { aircraft } = await searchParams;
  await requirePortalSession(slug);
  const qs = aircraft ? `?aircraft=${encodeURIComponent(aircraft)}` : "";
  redirect(`/${slug}/experience/pro-forma${qs}`);
}
