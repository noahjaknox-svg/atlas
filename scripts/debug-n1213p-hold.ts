import "../prisma/seed-env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.scheduleEvent.findMany({
    where: {
      tailNumber: "N1213P",
      deletedAt: null,
      summaryRaw: { contains: "Pine", mode: "insensitive" },
    },
    orderBy: { startsAt: "asc" },
  });
  console.log(events.map((e) => ({
    start: e.startsAt.toISOString(),
    end: e.endsAt.toISOString(),
    hold: e.isHold,
    class: e.availabilityClass,
    summary: e.summaryRaw,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
