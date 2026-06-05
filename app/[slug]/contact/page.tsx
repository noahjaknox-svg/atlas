import Link from "next/link";
import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { PortalGlobalPage } from "@/components/client/portal-global-page";

export default async function ClientContactPage({
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
      title={content.contactTitle}
    >
      {content.contactBody ? (
        <p className="whitespace-pre-wrap">{content.contactBody}</p>
      ) : null}
      <div className="mt-8 space-y-3 text-lg">
        <p>
          <span className="text-white/50">Email · </span>
          <Link
            href={`mailto:${content.contactEmail}`}
            className="text-atlas-accent hover:underline"
          >
            {content.contactEmail}
          </Link>
        </p>
        {content.contactPhone ? (
          <p>
            <span className="text-white/50">Phone · </span>
            <a href={`tel:${content.contactPhone}`} className="hover:underline">
              {content.contactPhone}
            </a>
          </p>
        ) : null}
      </div>
    </PortalGlobalPage>
  );
}
