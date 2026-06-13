-- OurAirports open-data reference (https://ourairports.com/data/)

CREATE TABLE IF NOT EXISTS country_reference (
  ourairports_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  continent TEXT,
  wikipedia_link TEXT,
  keywords TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS region_reference (
  ourairports_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  local_code TEXT,
  name TEXT NOT NULL,
  continent TEXT,
  iso_country TEXT NOT NULL,
  wikipedia_link TEXT,
  keywords TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS region_reference_iso_country_idx ON region_reference (iso_country);

CREATE TABLE IF NOT EXISTS airport_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ourairports_id INTEGER NOT NULL UNIQUE,
  ident TEXT NOT NULL UNIQUE,
  icao TEXT UNIQUE,
  iata TEXT,
  airport_type TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude_deg DECIMAL(10, 7),
  longitude_deg DECIMAL(10, 7),
  elevation_ft INTEGER,
  continent TEXT,
  iso_country TEXT NOT NULL,
  iso_region TEXT,
  municipality TEXT,
  scheduled_service BOOLEAN NOT NULL DEFAULT false,
  gps_code TEXT,
  local_code TEXT,
  home_link TEXT,
  wikipedia_link TEXT,
  keywords TEXT,
  longest_runway_ft INTEGER,
  source_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS airport_reference_iata_idx ON airport_reference (iata);
CREATE INDEX IF NOT EXISTS airport_reference_iso_country_idx ON airport_reference (iso_country);
CREATE INDEX IF NOT EXISTS airport_reference_municipality_idx ON airport_reference (municipality);
CREATE INDEX IF NOT EXISTS airport_reference_name_idx ON airport_reference (name);

CREATE TABLE IF NOT EXISTS airport_runway_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ourairports_id INTEGER NOT NULL UNIQUE,
  airport_id UUID NOT NULL REFERENCES airport_reference(id) ON DELETE CASCADE,
  airport_ident TEXT NOT NULL,
  length_ft INTEGER,
  width_ft INTEGER,
  surface TEXT,
  lighted BOOLEAN NOT NULL DEFAULT false,
  closed BOOLEAN NOT NULL DEFAULT false,
  le_ident TEXT,
  le_latitude_deg DECIMAL(10, 7),
  le_longitude_deg DECIMAL(10, 7),
  le_elevation_ft INTEGER,
  le_heading_deg_t INTEGER,
  le_displaced_threshold_ft INTEGER,
  he_ident TEXT,
  he_latitude_deg DECIMAL(10, 7),
  he_longitude_deg DECIMAL(10, 7),
  he_elevation_ft INTEGER,
  he_heading_deg_t INTEGER,
  he_displaced_threshold_ft INTEGER
);

CREATE INDEX IF NOT EXISTS airport_runway_reference_airport_id_idx ON airport_runway_reference (airport_id);
CREATE INDEX IF NOT EXISTS airport_runway_reference_airport_ident_idx ON airport_runway_reference (airport_ident);

CREATE TABLE IF NOT EXISTS airport_frequency_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ourairports_id INTEGER NOT NULL UNIQUE,
  airport_id UUID NOT NULL REFERENCES airport_reference(id) ON DELETE CASCADE,
  airport_ident TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  frequency_mhz DECIMAL(8, 3)
);

CREATE INDEX IF NOT EXISTS airport_frequency_reference_airport_id_idx ON airport_frequency_reference (airport_id);
CREATE INDEX IF NOT EXISTS airport_frequency_reference_airport_ident_idx ON airport_frequency_reference (airport_ident);
