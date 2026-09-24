-- CreateTable
CREATE TABLE "airport_nav_data" (
    "icao" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL DEFAULT true,
    "faa_id" TEXT,
    "iata_id" TEXT,
    "name" TEXT,
    "data_source" TEXT,
    "latitude_deg" DOUBLE PRECISION,
    "longitude_deg" DOUBLE PRECISION,
    "elevation_ft" INTEGER,
    "magnetic_variation_deg" DOUBLE PRECISION,
    "has_tower" BOOLEAN NOT NULL DEFAULT false,
    "has_beacon" BOOLEAN NOT NULL DEFAULT false,
    "runways" JSONB NOT NULL DEFAULT '[]',
    "frequencies" JSONB NOT NULL DEFAULT '[]',
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airport_nav_data_pkey" PRIMARY KEY ("icao")
);

-- CreateIndex
CREATE INDEX "airport_nav_data_fetched_at_idx" ON "airport_nav_data"("fetched_at");

