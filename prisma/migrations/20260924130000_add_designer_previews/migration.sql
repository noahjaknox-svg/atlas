-- CreateTable
CREATE TABLE "designer_previews" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designer_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "designer_previews_expires_at_idx" ON "designer_previews"("expires_at");

