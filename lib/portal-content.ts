import "server-only";
import { prisma } from "@/lib/db";
import {
  DEFAULT_CLOUD_IMAGE,
  DEFAULT_FLEET_ITEMS,
  DEFAULT_LOGO,
  DEFAULT_PORTAL_CONTENT,
  DEFAULT_SERVICES_PILLARS,
  type FleetShowcaseItem,
  type PortalContentData,
  type SectionMediaDefaults,
  type ServicePillar,
} from "@/lib/portal-constants";

export type { FleetShowcaseItem, PortalContentData, SectionMediaDefaults, ServicePillar };
export {
  DEFAULT_CLOUD_IMAGE,
  DEFAULT_FLEET_ITEMS,
  DEFAULT_LOGO,
  DEFAULT_PORTAL_CONTENT,
  DEFAULT_SERVICES_PILLARS,
};

/** Until `npx prisma generate` runs after migration 007. */
const portalDb = prisma as any;
function parsePillars(raw: unknown): ServicePillar[] {
  if (!Array.isArray(raw)) return DEFAULT_SERVICES_PILLARS;
  return raw
    .filter((p): p is ServicePillar => typeof p === "object" && p != null && "title" in p)
    .map((p) => ({
      title: String((p as ServicePillar).title),
      description: String((p as ServicePillar).description ?? ""),
      icon: (p as ServicePillar).icon,
    }));
}

function parseSectionDefaults(raw: unknown): SectionMediaDefaults {
  if (!raw || typeof raw !== "object") return DEFAULT_PORTAL_CONTENT.sectionDefaults;
  return raw as SectionMediaDefaults;
}

function rowToContent(row: {
  id: string;
  heroCloudImageUrl: string | null;
  heroCloudVideoUrl: string | null;
  logoUrl: string | null;
  aboutTitle: string;
  aboutBody: string;
  servicesTitle: string;
  servicesBody: string | null;
  servicesPillars: unknown;
  contactTitle: string;
  contactBody: string | null;
  contactEmail: string;
  contactPhone: string | null;
  fleetTitle: string;
  fleetBody: string | null;
  sectionDefaults: unknown;
}): PortalContentData {
  return {
    id: row.id,
    heroCloudImageUrl: row.heroCloudImageUrl ?? DEFAULT_CLOUD_IMAGE,
    heroCloudVideoUrl: row.heroCloudVideoUrl,
    logoUrl: row.logoUrl ?? DEFAULT_LOGO,
    aboutTitle: row.aboutTitle,
    aboutBody: row.aboutBody,
    servicesTitle: row.servicesTitle,
    servicesBody: row.servicesBody,
    servicesPillars: parsePillars(row.servicesPillars),
    contactTitle: row.contactTitle,
    contactBody: row.contactBody,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    fleetTitle: row.fleetTitle,
    fleetBody: row.fleetBody,
    sectionDefaults: parseSectionDefaults(row.sectionDefaults),
  };
}

export async function getPortalContent(): Promise<PortalContentData> {
  try {
    const row = await portalDb.portalContent.findUnique({ where: { id: "default" } });
    if (!row) {
      await portalDb.portalContent.create({
        data: {
          id: "default",
          aboutBody: DEFAULT_PORTAL_CONTENT.aboutBody,
          servicesPillars: DEFAULT_SERVICES_PILLARS,
          sectionDefaults: DEFAULT_PORTAL_CONTENT.sectionDefaults,
        },
      });
      return DEFAULT_PORTAL_CONTENT;
    }
    return rowToContent(row);
  } catch {
    return DEFAULT_PORTAL_CONTENT;
  }
}

export async function getFleetShowcase(): Promise<FleetShowcaseItem[]> {
  try {
    const rows = await portalDb.portalFleetShowcase.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length === 0) return DEFAULT_FLEET_ITEMS;
    return rows.map((r: {
      id: string;
      sortOrder: number;
      title: string;
      subtitle: string | null;
      imageUrl: string | null;
      videoUrl: string | null;
      posterUrl: string | null;
      specs: unknown;
      active: boolean;
    }) => ({
      id: r.id,
      sortOrder: r.sortOrder,
      title: r.title,
      subtitle: r.subtitle,
      imageUrl: r.imageUrl,
      videoUrl: r.videoUrl,
      posterUrl: r.posterUrl,
      specs: Array.isArray(r.specs)
        ? (r.specs as { label: string; value: string }[])
        : [],
      active: r.active,
    }));
  } catch {
    return DEFAULT_FLEET_ITEMS;
  }
}

export async function upsertPortalContent(
  data: Partial<PortalContentData> & { servicesPillars?: ServicePillar[] }
) {
  return portalDb.portalContent.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      heroCloudImageUrl: data.heroCloudImageUrl ?? DEFAULT_CLOUD_IMAGE,
      heroCloudVideoUrl: data.heroCloudVideoUrl ?? null,
      logoUrl: data.logoUrl ?? DEFAULT_LOGO,
      aboutTitle: data.aboutTitle ?? DEFAULT_PORTAL_CONTENT.aboutTitle,
      aboutBody: data.aboutBody ?? DEFAULT_PORTAL_CONTENT.aboutBody,
      servicesTitle: data.servicesTitle ?? DEFAULT_PORTAL_CONTENT.servicesTitle,
      servicesBody: data.servicesBody,
      servicesPillars: data.servicesPillars ?? DEFAULT_SERVICES_PILLARS,
      contactTitle: data.contactTitle ?? DEFAULT_PORTAL_CONTENT.contactTitle,
      contactBody: data.contactBody,
      contactEmail: data.contactEmail ?? DEFAULT_PORTAL_CONTENT.contactEmail,
      contactPhone: data.contactPhone,
      fleetTitle: data.fleetTitle ?? DEFAULT_PORTAL_CONTENT.fleetTitle,
      fleetBody: data.fleetBody,
      sectionDefaults: data.sectionDefaults ?? DEFAULT_PORTAL_CONTENT.sectionDefaults,
    },
    update: {
      heroCloudImageUrl: data.heroCloudImageUrl,
      heroCloudVideoUrl: data.heroCloudVideoUrl,
      logoUrl: data.logoUrl,
      aboutTitle: data.aboutTitle,
      aboutBody: data.aboutBody,
      servicesTitle: data.servicesTitle,
      servicesBody: data.servicesBody,
      servicesPillars: data.servicesPillars,
      contactTitle: data.contactTitle,
      contactBody: data.contactBody,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      fleetTitle: data.fleetTitle,
      fleetBody: data.fleetBody,
      sectionDefaults: data.sectionDefaults,
    },
  });
}

export async function replaceFleetShowcase(items: Omit<FleetShowcaseItem, "active">[]) {
  await prisma.$transaction([
    portalDb.portalFleetShowcase.deleteMany({}),
    ...items.map((item, i) =>
      portalDb.portalFleetShowcase.create({
        data: {
          id:
            item.id.startsWith("default") || item.id.startsWith("new-")
              ? undefined
              : item.id,
          sortOrder: i,
          title: item.title,
          subtitle: item.subtitle,
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl,
          posterUrl: item.posterUrl,
          specs: item.specs,
          active: true,
        },
      })
    ),
  ]);
}
