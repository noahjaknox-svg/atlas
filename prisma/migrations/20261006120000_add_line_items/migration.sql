-- CreateTable
CREATE TABLE "line_items" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "applies_to" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aircraft_type_line_item_values" (
    "id" UUID NOT NULL,
    "aircraft_type_id" UUID NOT NULL,
    "line_item_id" UUID NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aircraft_type_line_item_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "line_items_key_key" ON "line_items"("key");

-- CreateIndex
CREATE INDEX "aircraft_type_line_item_values_line_item_id_idx" ON "aircraft_type_line_item_values"("line_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_type_line_item_values_aircraft_type_id_line_item_i_key" ON "aircraft_type_line_item_values"("aircraft_type_id", "line_item_id");

-- AddForeignKey
ALTER TABLE "aircraft_type_line_item_values" ADD CONSTRAINT "aircraft_type_line_item_values_aircraft_type_id_fkey" FOREIGN KEY ("aircraft_type_id") REFERENCES "aircraft_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft_type_line_item_values" ADD CONSTRAINT "aircraft_type_line_item_values_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

