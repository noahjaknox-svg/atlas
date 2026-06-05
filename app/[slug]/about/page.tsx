import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { PortalGlobalPage } from "@/components/client/portal-global-page";

export default async function ClientAboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  const { portal, content, branding, clientDisplayName } = await loadActivePortal(slug);
  await trackPortalView(portal.id);

  return (
    <PortalGlobalPage
      slug={slug}
      clientDisplayName={clientDisplayName}
      branding={branding}
      title={content.aboutTitle}
    >
      <p className="whitespace-pre-wrap">{content.aboutBody}</p>
    </PortalGlobalPage>
  );
}
