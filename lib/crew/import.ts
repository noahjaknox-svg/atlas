import { prisma } from "@/lib/db";
import type { CrewInitialDataFile } from "@/lib/crew/types";
import { importCrewInitialData as importWithClient } from "@/lib/crew/import-data";

export async function importCrewInitialData(data: CrewInitialDataFile) {
  return importWithClient(prisma, data);
}
