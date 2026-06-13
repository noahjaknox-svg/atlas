-- JetInsight schedule ingestion + charter request matching

CREATE TYPE schedule_raw_event_type AS ENUM (
  'charter',
  'owner',
  'positioning',
  'maintenance',
  'ferry_mx',
  'training',
  'other'
);

CREATE TYPE schedule_availability_class AS ENUM (
  'hard_block',
  'soft_hold',
  'repo_opportunity',
  'info_only'
);

CREATE TYPE inbound_message_provider AS ENUM ('postmark', 'manual');

CREATE TYPE charter_request_status AS ENUM (
  'new',
  'parsed',
  'matched',
  'quoted',
  'sent_to_jetinsight'
);

CREATE TYPE charter_request_parsed_by AS ENUM ('rules', 'ai');

CREATE TABLE schedule_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ics_url TEXT NOT NULL,
  poll_interval_minutes INT NOT NULL DEFAULT 10,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES schedule_sources(id) ON DELETE CASCADE,
  external_uid TEXT NOT NULL,
  external_trip_code TEXT,
  external_url TEXT,
  tail_number TEXT NOT NULL,
  fleet_aircraft_id UUID REFERENCES crew_fleet_aircraft(id) ON DELETE SET NULL,
  dep_icao TEXT,
  arr_icao TEXT,
  location_icao TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  last_modified_at TIMESTAMPTZ,
  client_label TEXT,
  pax_count INT,
  pic_name TEXT,
  sic_name TEXT,
  cabin_crew TEXT[] NOT NULL DEFAULT '{}',
  summary_raw TEXT NOT NULL,
  description_raw TEXT,
  raw_event_type schedule_raw_event_type NOT NULL,
  is_hold BOOLEAN NOT NULL DEFAULT false,
  is_admin_block BOOLEAN NOT NULL DEFAULT false,
  availability_class schedule_availability_class NOT NULL,
  raw_ics JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_uid)
);

CREATE INDEX schedule_events_tail_starts_idx ON schedule_events(tail_number, starts_at);
CREATE INDEX schedule_events_class_starts_idx ON schedule_events(availability_class, starts_at);
CREATE INDEX schedule_events_source_active_idx ON schedule_events(source_id, starts_at)
  WHERE deleted_at IS NULL;

CREATE TABLE schedule_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES schedule_sources(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  events_upserted INT NOT NULL DEFAULT 0,
  events_deleted INT NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX schedule_sync_runs_source_started_idx ON schedule_sync_runs(source_id, started_at DESC);

CREATE TABLE inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider inbound_message_provider NOT NULL,
  message_id TEXT,
  from_address TEXT NOT NULL,
  to_address TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inbound_messages_received_idx ON inbound_messages(received_at DESC);

CREATE TABLE charter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id UUID REFERENCES inbound_messages(id) ON DELETE SET NULL,
  status charter_request_status NOT NULL DEFAULT 'new',
  requested_dep_icao TEXT,
  requested_arr_icao TEXT,
  requested_depart_at TIMESTAMPTZ,
  pax_count INT,
  client_name TEXT,
  notes TEXT,
  parse_confidence DECIMAL(5, 4),
  parsed_by charter_request_parsed_by,
  raw_extraction JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX charter_requests_status_idx ON charter_requests(status, created_at DESC);

CREATE TABLE charter_request_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES charter_requests(id) ON DELETE CASCADE,
  tail_number TEXT NOT NULL,
  fleet_aircraft_id UUID REFERENCES crew_fleet_aircraft(id) ON DELETE SET NULL,
  score DECIMAL(8, 4) NOT NULL,
  rank INT NOT NULL,
  reasoning JSONB NOT NULL DEFAULT '{}',
  recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX charter_request_matches_request_rank_idx ON charter_request_matches(request_id, rank);
