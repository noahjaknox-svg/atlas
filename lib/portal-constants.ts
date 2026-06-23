/** Client-safe portal defaults — no database imports. */

import type { ExperienceMasterTemplate } from "./experience-master";
import { PRISMJET_MEDIA } from "./prismjet-media";

export type ServicePillar = {
  title: string;
  description: string;
  icon?: string;
};

export type SectionMediaDefaults = Record<
  string,
  { imageUrl?: string; videoUrl?: string; posterUrl?: string }
>;

export type PortalContentData = {
  id: string;
  heroCloudImageUrl: string;
  heroCloudVideoUrl: string | null;
  logoUrl: string;
  aboutTitle: string;
  aboutBody: string;
  servicesTitle: string;
  servicesBody: string | null;
  servicesPillars: ServicePillar[];
  contactTitle: string;
  contactBody: string | null;
  contactEmail: string;
  contactPhone: string | null;
  fleetTitle: string;
  fleetBody: string | null;
  sectionDefaults: SectionMediaDefaults;
  /** Master copy for experience report pages — seeds new proposals. */
  experienceTemplates: ExperienceMasterTemplate[] | null;
};

export type FleetShowcaseItem = {
  id: string;
  sortOrder: number;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  specs: { label: string; value: string }[];
  active: boolean;
};

export const DEFAULT_CLOUD_IMAGE = PRISMJET_MEDIA.clouds;

/** Bundled loop — drop `cloud-flight-loop.mp4` in public/videos/ to enable. */
export const DEFAULT_CLOUD_VIDEO = "/videos/cloud-flight-loop.mp4";

/** Normalize cloud video URL — empty and bundled placeholder paths resolve to null (still image). */
export function resolveHeroCloudVideoUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed || trimmed === DEFAULT_CLOUD_VIDEO) return null;
  return trimmed;
}

export type PortalBrandingSnapshot = {
  heroCloudImageUrl?: string | null;
  heroCloudVideoUrl?: string | null;
  logoUrl?: string | null;
};

/** Live Proposal Design branding wins over published snapshot for global portal assets. */
export function resolvePortalBranding(
  content: Pick<PortalContentData, "heroCloudImageUrl" | "heroCloudVideoUrl" | "logoUrl">,
  _snapshot?: PortalBrandingSnapshot | null
) {
  return {
    heroCloudImageUrl: content.heroCloudImageUrl || DEFAULT_CLOUD_IMAGE,
    heroCloudVideoUrl: resolveHeroCloudVideoUrl(content.heroCloudVideoUrl),
    logoUrl: content.logoUrl || DEFAULT_LOGO,
  };
}
export const DEFAULT_LOGO = "/images/prismjet-logo.png";

export const DEFAULT_SERVICES_PILLARS: ServicePillar[] = [
  {
    title: "Aircraft Management",
    description: "Turnkey Part 91 operations with transparent reporting and owner advocacy.",
  },
  {
    title: "Charter Optimization",
    description: "Revenue programs that offset fixed costs while protecting owner utilization.",
  },
  {
    title: "Maintenance Oversight",
    description: "OEM-aligned maintenance planning, vendor negotiation, and quality control.",
  },
  {
    title: "Crew & Training",
    description: "Recruiting, scheduling, and recurrent training managed to your mission profile.",
  },
  {
    title: "Financial Transparency",
    description: "Atlas pro forma modeling with scenario planning built for ownership decisions.",
  },
];

export const DEFAULT_PORTAL_CONTENT: PortalContentData = {
  id: "default",
  heroCloudImageUrl: DEFAULT_CLOUD_IMAGE,
  heroCloudVideoUrl: DEFAULT_CLOUD_VIDEO,
  logoUrl: DEFAULT_LOGO,
  aboutTitle: "About PrismJet",
  aboutBody:
    "PrismJet delivers boutique aircraft management for discerning owners — combining operational excellence, charter revenue strategy, and clear financial reporting through Atlas.",
  servicesTitle: "Management Services",
  servicesBody:
    "A single team accountable for your aircraft, your schedule, and your investment.",
  servicesPillars: DEFAULT_SERVICES_PILLARS,
  contactTitle: "Your PrismJet Team",
  contactBody: "Reach your advisor directly — we respond within one business day.",
  contactEmail: "info@prismjet.com",
  contactPhone: "(480) 555-0100",
  fleetTitle: "Our Aircraft",
  fleetBody:
    "From light jets to ultra-long-range cabins, we manage aircraft matched to owner missions across North America.",
  sectionDefaults: {
    cover: { imageUrl: DEFAULT_CLOUD_IMAGE },
    aircraft_overview: { imageUrl: "/images/fleet-jet-placeholder.svg" },
  },
  experienceTemplates: null,
};

export const DEFAULT_FLEET_ITEMS: FleetShowcaseItem[] = [
  {
    id: "default-ch350",
    sortOrder: 0,
    title: "Challenger 350",
    subtitle: "Super-midsize — coast-to-coast nonstop",
    imageUrl: PRISMJET_MEDIA.challenger350,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.challenger350Cabin,
    specs: [
      { label: "Range", value: "3,200 nm" },
      { label: "Passengers", value: "8–9" },
      { label: "Cruise", value: "Mach 0.82" },
    ],
    active: true,
  },
  {
    id: "default-global5000",
    sortOrder: 1,
    title: "Global 5000",
    subtitle: "Ultra-long-range global missions",
    imageUrl: PRISMJET_MEDIA.global5000,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.sales,
    specs: [
      { label: "Range", value: "5,200 nm" },
      { label: "Passengers", value: "13–16" },
      { label: "Cruise", value: "Mach 0.88" },
    ],
    active: true,
  },
];
