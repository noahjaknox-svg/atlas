-- Global portal layout width presets (desktop/mobile % per named tier)
ALTER TABLE portal_content
  ADD COLUMN IF NOT EXISTS layout_settings JSONB;
