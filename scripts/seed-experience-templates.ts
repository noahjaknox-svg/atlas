import "../prisma/seed-env";
import { PrismaClient } from "@prisma/client";
import { codeDefaultsAsMasterTemplates } from "../lib/experience-master";

const prisma = new PrismaClient();

async function main() {
  const templates = codeDefaultsAsMasterTemplates();
  await prisma.portalContent.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      experienceTemplates: templates,
    },
    update: {
      experienceTemplates: templates,
    },
  });
  console.log(`Seeded ${templates.length} experience master templates to portal_content.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
