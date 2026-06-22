import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function delegateReady(client: PrismaClient, key: string): boolean {
  const delegate = (client as unknown as Record<string, unknown>)[key];
  return (
    typeof delegate === "object" &&
    delegate !== null &&
    typeof (delegate as { findUnique?: unknown }).findUnique === "function"
  );
}

function modelsReady(client: PrismaClient): boolean {
  return (
    delegateReady(client, "proposalOwnerProfile") &&
    delegateReady(client, "portalContent") &&
    delegateReady(client, "airportReference") &&
    delegateReady(client, "warehouseAircraft") &&
    delegateReady(client, "fboHangarOverride") &&
    delegateReady(client, "companySettings") &&
    delegateReady(client, "fbo") &&
    delegateReady(client, "proposalAssumption")
  );
}

function disconnectStaleClient(client: PrismaClient | undefined) {
  if (!client) return;
  void client.$disconnect().catch(() => {
    /* ignore — client may already be closed */
  });
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;

  if (cached && modelsReady(cached)) {
    return cached;
  }

  // Dev hot-reload can keep a stale singleton missing new models — replace it,
  // but always disconnect the old client first to avoid exhausting the pool.
  disconnectStaleClient(cached);

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();
