-- Ensure portal designer layout_settings exists for prisma migrate deploy
ALTER TABLE portal_content
  ADD COLUMN IF NOT EXISTS layout_settings JSONB;
