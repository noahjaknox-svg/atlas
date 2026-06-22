import { prisma } from "@/lib/db";
import { PinGate } from "@/components/client/pin-gate";
import { getPortalContent } from "@/lib/portal-content";
import { resolveHeroCloudVideoUrl } from "@/lib/portal-constants";

export default async function ClientPortalPinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const portal = await prisma.clientPortal.findUnique({
    where: { slug },
    include: {
      proposal: {
        include: {
          prospect: true,
          sections: { where: { sectionType: "cover" }, take: 1 },
        },
      },
    },
  });

  const title =
    portal?.proposal.sections[0]?.title ??
    "Your Aircraft Management Outlook";

  if (!portal?.active) {
    return (
      <div className="flex min-h-screen items-center justify-center text-atlas-muted">
        This proposal link is not available.
      </div>
    );
  }

  const content = await getPortalContent();

  return (
    <PinGate
      slug={slug}
      title={title}
      heroCloudImageUrl={content.heroCloudImageUrl}
      heroCloudVideoUrl={resolveHeroCloudVideoUrl(content.heroCloudVideoUrl)}
      logoUrl={content.logoUrl}
    />
  );
}
