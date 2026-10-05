import { z } from "zod";
import type { UsageType } from "@prisma/client";
import { parseUsageTypeConfig, type UsageTypeConfig } from "@/lib/usage-type-config";

const lineSettingSchema = z.object({ include: z.boolean(), showClient: z.boolean() });

const configSchema = z.object({
  version: z.literal(1).optional(),
  showRevenueSection: z.boolean().optional(),
  lines: z.record(z.string(), lineSettingSchema).optional(),
});

/** Body for POST/PATCH /api/data/usage-types. Every field optional on PATCH. */
export const usageTypeBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
  charterEnabled: z.boolean().optional(),
  config: configSchema.optional(),
});

export type UsageTypeWire = Omit<UsageType, "config"> & { config: UsageTypeConfig };

/** API shape: config always present with defaults filled in. */
export function toUsageTypeWire(row: UsageType): UsageTypeWire {
  return { ...row, config: parseUsageTypeConfig(row.config) };
}
