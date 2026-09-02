-- Block-to-Flight Factor on General and Company settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS charter_block_to_flight_ratio numeric(6, 4) NOT NULL DEFAULT 1.13;

UPDATE company_settings
SET charter_block_to_flight_ratio = 1.13
WHERE id = 'default' AND charter_block_to_flight_ratio IS NULL;
