-- Active AFM/POH PDF metadata on aircraft types (document only; grids stay JSON).

ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_pdf_url" TEXT;
ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_pdf_file_name" TEXT;
ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_pdf_category" TEXT DEFAULT 'afm_poh';
ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_pdf_revision" TEXT;
ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_pdf_effective_date" DATE;
ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_pdf_uploaded_at" TIMESTAMP(3);
