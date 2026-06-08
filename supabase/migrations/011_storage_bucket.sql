-- Public storage bucket for proposal report media (hero images, galleries, aircraft photos).
-- Uploads go through the internal-only /api/uploads route using the service role key,
-- so write access stays server-side; reads are public so client portals can render media.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposal-media',
  'proposal-media',
  true,
  12582912, -- 12MB, matches /api/uploads MAX_BYTES
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for the bucket's objects.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'proposal_media_public_read'
  ) THEN
    CREATE POLICY proposal_media_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'proposal-media');
  END IF;
END $$;
