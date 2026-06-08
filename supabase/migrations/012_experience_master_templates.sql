-- Master experience page templates for all proposals (edited at /proposal-design).
ALTER TABLE portal_content
  ADD COLUMN IF NOT EXISTS experience_templates JSONB;
