-- Custom portal pages with per-proposal URL slugs
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'custom_page';

ALTER TABLE "proposal_sections"
  ADD COLUMN IF NOT EXISTS "page_slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "proposal_sections_proposal_id_page_slug_key"
  ON "proposal_sections" ("proposal_id", "page_slug")
  WHERE "page_slug" IS NOT NULL;
