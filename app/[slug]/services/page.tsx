import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { PortalGlobalPage, ServicesPillars } from "@/components/client/portal-global-page";

export default async function ClientServicesPage({
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
      title={content.servicesTitle}
    >
      {content.servicesBody ? (
        <p className="whitespace-pre-wrap">{content.servicesBody}</p>
      ) : null}
      <ServicesPillars pillars={content.servicesPillars} />
    </PortalGlobalPage>
  );
}
