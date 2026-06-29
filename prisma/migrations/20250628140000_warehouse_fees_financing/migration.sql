-- Per-aircraft operating fees (migrated from company_settings globals)
ALTER TABLE "warehouse_aircraft" ADD COLUMN IF NOT EXISTS "wifi_annual" INTEGER;
ALTER TABLE "warehouse_aircraft" ADD COLUMN IF NOT EXISTS "subscriptions_annual" INTEGER;
ALTER TABLE "warehouse_aircraft" ADD COLUMN IF NOT EXISTS "cleaning_annual" INTEGER;
ALTER TABLE "warehouse_aircraft" ADD COLUMN IF NOT EXISTS "supplies_annual" INTEGER;
ALTER TABLE "warehouse_aircraft" ADD COLUMN IF NOT EXISTS "airport_fees_annual" INTEGER;

-- Copy legacy company defaults onto each aircraft row (where aircraft fields are null)
UPDATE "warehouse_aircraft" wa
SET
  "wifi_annual" = COALESCE(wa."wifi_annual", cs."default_wifi_annual"),
  "subscriptions_annual" = COALESCE(wa."subscriptions_annual", cs."default_subscriptions_annual"),
  "cleaning_annual" = COALESCE(wa."cleaning_annual", cs."default_cleaning_annual"),
  "supplies_annual" = COALESCE(wa."supplies_annual", cs."default_supplies_annual"),
  "airport_fees_annual" = COALESCE(wa."airport_fees_annual", cs."default_airport_fees_annual")
FROM "company_settings" cs
WHERE cs."id" = 'default';

-- Financing template: down payment as percent
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "default_down_payment_percent" DECIMAL(6, 3);

UPDATE "company_settings"
SET "default_down_payment_percent" = CASE
  WHEN "default_loan_amount" IS NOT NULL
    AND "default_loan_amount" > 0
    AND "default_down_payment" IS NOT NULL
    THEN ROUND(("default_down_payment"::decimal / "default_loan_amount"::decimal) * 100, 3)
  ELSE NULL
END
WHERE "id" = 'default';

ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_wifi_annual";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_subscriptions_annual";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_cleaning_annual";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_supplies_annual";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_airport_fees_annual";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_fet_treatment";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_financing_enabled";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_loan_amount";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "default_down_payment";
