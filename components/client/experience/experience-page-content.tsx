import { notFound } from "next/navigation";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { SLUG_TO_SECTION_TYPE } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import type { ClientSnapshotView } from "@/lib/client-serializer";
import { WelcomePage } from "./welcome-page";
import { AboutUsPage } from "./about-us-page";
import { AircraftManagementPage } from "./aircraft-management-page";
import { AircraftCharterPage } from "./aircraft-charter-page";
import { MaintenancePage } from "./maintenance-page";
import { SalesAcquisitionsPage } from "./sales-acquisitions-page";
import { ConformityPage } from "./conformity-page";
import { ExperienceProFormaPage } from "./experience-pro-forma-page";

export function ExperiencePageContent({
  pageSlug,
  section,
  payload,
  contactName,
  branding,
  slug,
  client,
  aircraftParam,
}: {
  pageSlug: string;
  section: ExperienceSectionSnapshot;
  payload: ProposalSnapshotPayload;
  contactName: string;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null; logoUrl: string | null };
  slug: string;
  client?: ClientSnapshotView;
  aircraftParam?: string | null;
}) {
  if (!section.visible) notFound();

  const sectionType = SLUG_TO_SECTION_TYPE[pageSlug] ?? section.sectionType;

  switch (sectionType) {
    case "welcome":
      return (
        <WelcomePage
          section={section}
          payload={payload}
          contactName={contactName}
          branding={branding}
          slug={slug}
        />
      );
    case "about_us":
      return <AboutUsPage section={section} branding={branding} />;
    case "aircraft_management":
      return <AircraftManagementPage section={section} branding={branding} />;
    case "aircraft_charter":
      return <AircraftCharterPage section={section} branding={branding} />;
    case "maintenance":
      return <MaintenancePage section={section} branding={branding} />;
    case "sales_acquisitions":
      return <SalesAcquisitionsPage section={section} branding={branding} />;
    case "conformity_process":
      return <ConformityPage section={section} branding={branding} />;
    case "pro_forma":
      if (!client) notFound();
      return (
        <ExperienceProFormaPage
          slug={slug}
          section={section}
          client={client}
          branding={branding}
          aircraftParam={aircraftParam}
        />
      );
    default:
      notFound();
  }
}
