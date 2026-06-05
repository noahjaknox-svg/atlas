-- Experience presentation: new section types and structured content fields

ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'welcome';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'about_us';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'aircraft_management';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'aircraft_charter';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'sales_acquisitions';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'conformity_process';

ALTER TABLE proposal_sections
  ADD COLUMN IF NOT EXISTS layout_variant TEXT,
  ADD COLUMN IF NOT EXISTS content_blocks JSONB,
  ADD COLUMN IF NOT EXISTS signatory_name TEXT,
  ADD COLUMN IF NOT EXISTS signatory_title TEXT;
