-- Portal global content + fleet showcase + section video fields
ALTER TABLE proposal_sections
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

CREATE TABLE IF NOT EXISTS portal_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_cloud_image_url TEXT,
  hero_cloud_video_url TEXT,
  logo_url TEXT,
  about_title TEXT NOT NULL DEFAULT 'About PrismJet',
  about_body TEXT NOT NULL DEFAULT '',
  services_title TEXT NOT NULL DEFAULT 'Our Services',
  services_body TEXT,
  services_pillars JSONB NOT NULL DEFAULT '[]',
  contact_title TEXT NOT NULL DEFAULT 'Contact',
  contact_body TEXT,
  contact_email TEXT NOT NULL DEFAULT 'info@prismjet.com',
  contact_phone TEXT,
  fleet_title TEXT NOT NULL DEFAULT 'Our Aircraft',
  fleet_body TEXT,
  section_defaults JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_fleet_showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  video_url TEXT,
  poster_url TEXT,
  specs JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO portal_content (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
