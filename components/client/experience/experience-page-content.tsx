"use client";

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
import { WelcomePageV2 } from "./v2/layouts/welcome-page-v2";
import { ExperienceProFormaPageV2 } from "./v2/layouts/experience-pro-forma-page-v2";
import {
  AboutUsPageV2,
  AircraftCharterPageV2,
  AircraftManagementPageV2,
  ConformityPageV2,
  MaintenancePageV2,
  SalesAcquisitionsPageV2,
} from "./v2/layouts/chapter-pages-v2";

export function ExperiencePageContent({
  pageSlug,
  section,
  payload,
  contactName,
  branding,
  slug,
  client,
  aircraftParam,
  renderV2 = false,
}: {
  pageSlug: string;
  section: ExperienceSectionSnapshot;
  payload: ProposalSnapshotPayload;
  contactName: string;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null; logoUrl: string | null };
  slug: string;
  client?: ClientSnapshotView;
  aircraftParam?: string | null;
  /** Use v2 presentation layouts (prism stage shell). */
  renderV2?: boolean;
}) {
  if (!section.visible) return null;

  const sectionType = SLUG_TO_SECTION_TYPE[pageSlug] ?? section.sectionType;

  if (renderV2) {
    switch (sectionType) {
      case "welcome":
        return (
          <WelcomePageV2 section={section} payload={payload} contactName={contactName} />
        );
      case "about_us":
        return <AboutUsPageV2 section={section} branding={branding} />;
      case "aircraft_management":
        return <AircraftManagementPageV2 section={section} branding={branding} />;
      case "aircraft_charter":
        return (
          <AircraftCharterPageV2 section={section} branding={branding} payload={payload} />
        );
      case "maintenance":
        return <MaintenancePageV2 section={section} branding={branding} />;
      case "sales_acquisitions":
        return <SalesAcquisitionsPageV2 section={section} branding={branding} />;
      case "conformity_process":
        return <ConformityPageV2 section={section} branding={branding} />;
      case "pro_forma":
        if (!client) return null;
        return (
          <ExperienceProFormaPageV2
            slug={slug}
            section={section}
            client={client}
            aircraftParam={aircraftParam}
            contactName={contactName}
            payloadMetrics={payload.metrics}
          />
        );
      default:
        return null;
    }
  }

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
      return <AircraftCharterPage section={section} branding={branding} payload={payload} />;
    case "maintenance":
      return <MaintenancePage section={section} branding={branding} />;
    case "sales_acquisitions":
      return <SalesAcquisitionsPage section={section} branding={branding} />;
    case "conformity_process":
      return <ConformityPage section={section} branding={branding} />;
    case "pro_forma":
      if (!client) return null;
      return (
        <ExperienceProFormaPage
          slug={slug}
          section={section}
          client={client}
          branding={branding}
          aircraftParam={aircraftParam}
          contactName={contactName}
        />
      );
    default:
      return null;
  }
}
