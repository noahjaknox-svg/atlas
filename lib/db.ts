import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function modelsReady(client: PrismaClient): boolean {
  return (
    "proposalOwnerProfile" in client &&
    "portalContent" in client &&
    "airportReference" in client
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
