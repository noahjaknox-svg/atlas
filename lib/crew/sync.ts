import { prisma } from "@/lib/db";
import {
  buildCrewSyncPayloadFromDb,
  type CrewSyncPayload,
} from "@/lib/crew/sync-data";

export type { CrewSyncPayload };

export async function buildCrewSyncPayload(
  ifModifiedSince?: Date | null
): Promise<CrewSyncPayload> {
  return buildCrewSyncPayloadFromDb(prisma, ifModifiedSince);
}
