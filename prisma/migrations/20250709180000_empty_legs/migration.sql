-- Empty legs, public lists, fleet/pricing profiles, leads, view events

CREATE TYPE "EmptyLegAvailabilityStatus" AS ENUM ('available', 'unavailable');
CREATE TYPE "EmptyLegForceState" AS ENUM ('force_available', 'force_unavailable');
CREATE TYPE "EmptyLegLifecycleStatus" AS ENUM ('active', 'history');
CREATE TYPE "EmptyLegHistoryReason" AS ENUM ('route_changed', 'trip_removed');
CREATE TYPE "EmptyLegPlacementStatus" AS ENUM ('needs_approval', 'approved', 'hidden');
CREATE TYPE "EmptyLegPricingMode" AS ENUM ('calculated', 'custom', 'hide_price');
CREATE TYPE "EmptyLegLayoutStyle" AS ENUM ('card_grid', 'compact_list');
CREATE TYPE "EmptyLegRoutingProfileScope" AS ENUM ('global', 'public_list');
CREATE TYPE "EmptyLegDiscountDisplayMode" AS ENUM ('show_both', 'discounted_only', 'none');
CREATE TYPE "CharterLeadRequestType" AS ENUM ('direct_empty_leg', 'off_routing_empty_leg', 'custom_quote');
CREATE TYPE "CharterLeadEmailStatus" AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE "EmptyLegViewEventType" AS ENUM ('list_view', 'detail_open');

CREATE TABLE "empty_legs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_number" TEXT NOT NULL,
  "route_key" TEXT NOT NULL,
  "dep_icao" TEXT NOT NULL,
  "arr_icao" TEXT NOT NULL,
  "tail_number" TEXT NOT NULL,
  "aircraft_type" TEXT,
  "source_schedule_event_id" UUID,
  "source_ical_uid" TEXT,
  "source_jetinsight_url" TEXT,
  "scheduled_departure_at" TIMESTAMPTZ NOT NULL,
  "scheduled_arrival_at" TIMESTAMPTZ NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "last_synced_at" TIMESTAMPTZ,
  "availability_status" "EmptyLegAvailabilityStatus" NOT NULL DEFAULT 'available',
  "force_state" "EmptyLegForceState",
  "force_applied_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "force_applied_at" TIMESTAMPTZ,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "sliding_window_start_at" TIMESTAMPTZ,
  "sliding_window_end_at" TIMESTAMPTZ,
  "internal_notes" TEXT,
  "lifecycle_status" "EmptyLegLifecycleStatus" NOT NULL DEFAULT 'active',
  "history_reason" "EmptyLegHistoryReason",
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "detail_open_count" INTEGER NOT NULL DEFAULT 0,
  "submission_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "empty_legs_active_trip_route_uidx"
  ON "empty_legs" ("trip_number", "route_key")
  WHERE "lifecycle_status" = 'active';

CREATE INDEX "empty_legs_trip_number_idx" ON "empty_legs" ("trip_number");
CREATE INDEX "empty_legs_tail_number_idx" ON "empty_legs" ("tail_number");
CREATE INDEX "empty_legs_dep_arr_idx" ON "empty_legs" ("dep_icao", "arr_icao");
CREATE INDEX "empty_legs_scheduled_departure_at_idx" ON "empty_legs" ("scheduled_departure_at");
CREATE INDEX "empty_legs_lifecycle_departure_idx" ON "empty_legs" ("lifecycle_status", "scheduled_departure_at");
CREATE INDEX "empty_legs_trip_route_lifecycle_idx" ON "empty_legs" ("trip_number", "route_key", "lifecycle_status");

CREATE TABLE "empty_leg_public_lists" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "token" TEXT NOT NULL UNIQUE,
  "token_revoked_at" TIMESTAMPTZ,
  "default_placement_status" "EmptyLegPlacementStatus" NOT NULL DEFAULT 'needs_approval',
  "layout_style" "EmptyLegLayoutStyle" NOT NULL DEFAULT 'card_grid',
  "default_pricing_mode" "EmptyLegPricingMode" NOT NULL DEFAULT 'calculated',
  "discount_percent" DECIMAL(6, 3),
  "discount_display_mode" "EmptyLegDiscountDisplayMode" NOT NULL DEFAULT 'none',
  "minimum_quotable_hours" DECIMAL(6, 2),
  "settings_json" JSONB NOT NULL DEFAULT '{}',
  "recipient_email_override" TEXT,
  "confirmation_template_override" TEXT,
  "internal_notification_template_override" TEXT,
  "branding_override_json" JSONB NOT NULL DEFAULT '{}',
  "visible_fields_json" JSONB NOT NULL DEFAULT '{}',
  "consent_text_override" TEXT,
  "disclaimer_override" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "empty_leg_placements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "empty_leg_id" UUID NOT NULL REFERENCES "empty_legs"("id") ON DELETE CASCADE,
  "public_list_id" UUID NOT NULL REFERENCES "empty_leg_public_lists"("id") ON DELETE CASCADE,
  "status" "EmptyLegPlacementStatus" NOT NULL DEFAULT 'needs_approval',
  "pricing_mode" "EmptyLegPricingMode" NOT NULL DEFAULT 'calculated',
  "custom_price" DECIMAL(12, 2),
  "display_discount_mode" "EmptyLegDiscountDisplayMode" NOT NULL DEFAULT 'none',
  "pricing_result_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("empty_leg_id", "public_list_id")
);

CREATE INDEX "empty_leg_placements_list_status_idx"
  ON "empty_leg_placements" ("public_list_id", "status");

CREATE TABLE "empty_leg_routing_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "scope" "EmptyLegRoutingProfileScope" NOT NULL DEFAULT 'global',
  "public_list_id" UUID REFERENCES "empty_leg_public_lists"("id") ON DELETE CASCADE,
  "dep_icao" TEXT NOT NULL,
  "arr_icao" TEXT NOT NULL,
  "fixed_price" DECIMAL(12, 2) NOT NULL,
  "tail_numbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "empty_leg_routing_profiles_dep_arr_idx"
  ON "empty_leg_routing_profiles" ("dep_icao", "arr_icao");
CREATE INDEX "empty_leg_routing_profiles_scope_list_idx"
  ON "empty_leg_routing_profiles" ("scope", "public_list_id");

CREATE TABLE "empty_leg_aircraft_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "default_hourly_rate" DECIMAL(12, 2) NOT NULL,
  "minimum_quotable_time_fallback" DECIMAL(6, 2),
  "off_routing_time_allowance_hours" DECIMAL(6, 2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "empty_leg_fleet_tail_configs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tail_number" TEXT NOT NULL UNIQUE,
  "aircraft_type" TEXT NOT NULL,
  "public_display_type" TEXT,
  "aircraft_profile_id" UUID REFERENCES "empty_leg_aircraft_profiles"("id") ON DELETE SET NULL,
  "seat_count" INTEGER,
  "luggage_note" TEXT,
  "wifi" BOOLEAN NOT NULL DEFAULT false,
  "amenities_json" JSONB NOT NULL DEFAULT '[]',
  "description" TEXT,
  "primary_photo_url" TEXT,
  "photo_urls_json" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "empty_leg_settings" (
  "id" TEXT PRIMARY KEY DEFAULT 'default',
  "default_lead_recipient_email" TEXT,
  "customer_confirmation_template" TEXT,
  "internal_notification_template" TEXT,
  "consent_text" TEXT,
  "disclaimer_text" TEXT,
  "branding_json" JSONB NOT NULL DEFAULT '{}',
  "promotion_label" TEXT NOT NULL DEFAULT 'Featured Empty Leg',
  "city_search_radius_nm" INTEGER NOT NULL DEFAULT 50,
  "default_layout_style" "EmptyLegLayoutStyle" NOT NULL DEFAULT 'card_grid',
  "default_visible_fields_json" JSONB NOT NULL DEFAULT '{}',
  "default_pricing_mode" "EmptyLegPricingMode" NOT NULL DEFAULT 'calculated',
  "default_minimum_quotable_hours" DECIMAL(6, 2) NOT NULL DEFAULT 1.5,
  "default_discount_percent" DECIMAL(6, 3),
  "default_discount_display_mode" "EmptyLegDiscountDisplayMode" NOT NULL DEFAULT 'none',
  "send_customer_confirmation" BOOLEAN NOT NULL DEFAULT true,
  "last_charter_sync_at" TIMESTAMPTZ,
  "last_charter_sync_status" TEXT,
  "last_charter_sync_stats_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "empty_leg_settings" ("id") VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE "charter_leads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "notes" TEXT,
  "consent_accepted" BOOLEAN NOT NULL DEFAULT false,
  "request_type" "CharterLeadRequestType" NOT NULL,
  "requested_dep" TEXT,
  "requested_arr" TEXT,
  "requested_date" TIMESTAMPTZ,
  "requested_search_json" JSONB NOT NULL DEFAULT '{}',
  "empty_leg_id" UUID REFERENCES "empty_legs"("id") ON DELETE SET NULL,
  "source_public_list_id" UUID NOT NULL REFERENCES "empty_leg_public_lists"("id") ON DELETE RESTRICT,
  "source_placement_id" UUID REFERENCES "empty_leg_placements"("id") ON DELETE SET NULL,
  "assigned_representative_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "email_status" "CharterLeadEmailStatus" NOT NULL DEFAULT 'pending',
  "email_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "charter_leads_submitted_at_idx" ON "charter_leads" ("submitted_at" DESC);
CREATE INDEX "charter_leads_source_list_idx" ON "charter_leads" ("source_public_list_id");
CREATE INDEX "charter_leads_email_status_idx" ON "charter_leads" ("email_status");
CREATE INDEX "charter_leads_request_type_idx" ON "charter_leads" ("request_type");

CREATE TABLE "empty_leg_view_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "empty_leg_id" UUID REFERENCES "empty_legs"("id") ON DELETE SET NULL,
  "public_list_id" UUID NOT NULL REFERENCES "empty_leg_public_lists"("id") ON DELETE CASCADE,
  "placement_id" UUID REFERENCES "empty_leg_placements"("id") ON DELETE SET NULL,
  "event_type" "EmptyLegViewEventType" NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "empty_leg_view_events_list_created_idx"
  ON "empty_leg_view_events" ("public_list_id", "created_at" DESC);
CREATE INDEX "empty_leg_view_events_leg_type_idx"
  ON "empty_leg_view_events" ("empty_leg_id", "event_type");
