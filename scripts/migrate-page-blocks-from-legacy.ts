/**
 * Optional one-time migration: add pageBlocks to master templates from legacy fields.
 * Run: npx dotenv -e .env.local -- tsx scripts/migrate-page-blocks-from-legacy.ts
 */
import { prisma } from "../lib/db";
import { getExperienceMasterTemplates, upsertPortalContent } from "../lib/portal-content";
import {
  getSectionPageBlocks,
  patchSectionPageBlocks,
} from "../lib/page-blocks-utils";

async function main() {
  const templates = await getExperienceMasterTemplates();
  let updated = 0;

  const next = templates.map((template) => {
    if (template.contentBlocks?.pageBlocks?.length) return template;
    const pageBlocks = getSectionPageBlocks(template);
    if (pageBlocks.length === 0) return template;
    updated += 1;
    return {
      ...template,
      contentBlocks: patchSectionPageBlocks(template.contentBlocks ?? null, pageBlocks),
    };
  });

  if (updated === 0) {
    console.log("No master templates needed pageBlocks migration.");
    return;
  }

  await upsertPortalContent({ experienceTemplates: next });
  console.log(`Migrated pageBlocks on ${updated} master template(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
