import { z } from "zod";
import { sanitizeExperiencePageLinks } from "./experience-content";

const galleryItemSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
});

const blockLayoutSchema = z.object({
  width: z.enum(["auto", "narrow", "medium", "full"]).optional(),
  widthDesktop: z.string().optional(),
  widthMobile: z.string().optional(),
  visibility: z.enum(["both", "desktop", "mobile"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "center", "bottom"]).optional(),
  padding: z.enum(["none", "sm", "md", "lg"]).optional(),
});

const leafBlockFields = {
  id: z.string(),
  blockLayout: blockLayoutSchema.optional(),
};

type PageBlockZod = z.ZodType<{
  id: string;
  type: string;
  [key: string]: unknown;
}>;

const pageBlockSchema: PageBlockZod = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      ...leafBlockFields,
      type: z.literal("text"),
      markdown: z.string(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("heading"),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      text: z.string(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("image"),
      url: z.string(),
      alt: z.string().optional(),
      caption: z.string().optional(),
      variant: z
        .enum([
          "hero",
          "editorial-large",
          "editorial-small",
          "portrait-featured",
          "portrait-standard",
          "landscape-wide",
        ])
        .optional(),
      imageSize: z.enum(["icon", "small", "fit", "large"]).optional(),
      cropAspectRatio: z.number().positive().optional(),
      focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
      crop: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("gallery"),
      layout: z.string().optional(),
      items: z.array(galleryItemSchema),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("html"),
      html: z.string(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("spacer"),
      size: z.enum(["sm", "md", "lg"]).optional(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("quote"),
      text: z.string(),
      attribution: z.string().optional(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("cta"),
      label: z.string(),
      url: z.string(),
      variant: z.enum(["primary", "secondary"]).optional(),
    }),
    z.object({
      ...leafBlockFields,
      type: z.literal("video"),
      url: z.string(),
      posterUrl: z.string().optional(),
      caption: z.string().optional(),
    }),
    z.object({
      id: z.string(),
      type: z.literal("row"),
      preset: z.enum(["equal-2", "equal-3", "wide-narrow", "narrow-wide"]),
      gap: z.enum(["sm", "md", "lg"]).optional(),
      display: z.enum(["columns", "rows"]).optional(),
      columnWeights: z.array(z.number().positive()).optional(),
      blockLayout: blockLayoutSchema.optional(),
      columns: z.array(z.array(pageBlockSchema)),
    }),
    z.object({
      id: z.string(),
      type: z.literal("container"),
      rows: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      cols: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      gap: z.enum(["sm", "md", "lg"]).optional(),
      columnWeights: z.array(z.number().positive()).optional(),
      rowWeights: z.array(z.number().positive()).optional(),
      width: z.enum(["auto", "narrow", "medium", "full"]).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      blockLayout: blockLayoutSchema.optional(),
      cellAlign: z.enum(["start", "stretch"]).optional(),
      cells: z.array(z.array(z.array(pageBlockSchema))),
    }),
  ])
);

const contentBlocksSchema = z
  .object({
    pillars: z.array(z.any()).optional(),
    timeline: z.array(z.any()).optional(),
    checklist: z.array(z.any()).optional(),
    comparisonRows: z.array(z.any()).optional(),
    quote: z.any().optional(),
    callout: z.any().optional(),
    introBullets: z.array(z.string()).optional(),
    goalBullets: z.array(z.string()).optional(),
    recordsIssues: z.array(z.string()).optional(),
    ownerRecommendations: z.array(z.string()).optional(),
    downtimeStrategies: z.array(z.string()).optional(),
    explainerCards: z.array(z.any()).optional(),
    serviceTiles: z.array(z.any()).optional(),
    gallery: z.array(galleryItemSchema).optional(),
    navLinks: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    contactWebsite: z.string().optional(),
    contactAddress: z.string().optional(),
    aircraftMarketUrl: z.string().nullable().optional(),
    aircraftMarketButtonLabel: z.string().nullable().optional(),
    pageBlocks: z.array(pageBlockSchema).optional(),
  })
  .passthrough();

export const proposalSectionPatchSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  bodyCopy: z.string().nullable().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().optional(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  layoutVariant: z.string().nullable().optional(),
  calloutMetricLabel: z.string().nullable().optional(),
  calloutMetricValue: z.string().nullable().optional(),
  signatoryName: z.string().nullable().optional(),
  signatoryTitle: z.string().nullable().optional(),
  pageSlug: z.string().nullable().optional(),
  contentBlocks: contentBlocksSchema.optional(),
  usageTypeIds: z.array(z.string()).optional(),
});

export type ProposalSectionPatch = z.infer<typeof proposalSectionPatchSchema>;

export { pageBlockSchema };

export function sanitizeSectionContentBlocks(
  incoming: z.infer<typeof contentBlocksSchema> | undefined
): Record<string, unknown> | undefined {
  if (!incoming) return undefined;
  const next = { ...incoming };
  if (next.navLinks) {
    next.navLinks = sanitizeExperiencePageLinks(next.navLinks);
  }
  return next;
}
