-- View analytics moved from the hosted analytics service into Postgres.
-- Five event tables; no column for a viewer IP address exists on purpose.
-- Rows older than 365 days are deleted by lib/events/retention.ts.

-- CreateTable
CREATE TABLE "PageViewEvent" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "dataroomId" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "time" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "pageNumber" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "region" TEXT NOT NULL DEFAULT 'Unknown',
    "latitude" TEXT NOT NULL DEFAULT 'Unknown',
    "longitude" TEXT NOT NULL DEFAULT 'Unknown',
    "ua" TEXT NOT NULL DEFAULT 'Unknown',
    "browser" TEXT NOT NULL DEFAULT 'Unknown',
    "browserVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "engine" TEXT NOT NULL DEFAULT 'Unknown',
    "engineVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "os" TEXT NOT NULL DEFAULT 'Unknown',
    "osVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "device" TEXT NOT NULL DEFAULT 'Desktop',
    "deviceVendor" TEXT NOT NULL DEFAULT 'Unknown',
    "deviceModel" TEXT NOT NULL DEFAULT 'Unknown',
    "cpuArchitecture" TEXT NOT NULL DEFAULT 'Unknown',
    "bot" BOOLEAN NOT NULL DEFAULT false,
    "referer" TEXT NOT NULL DEFAULT '(direct)',
    "refererUrl" TEXT NOT NULL DEFAULT '(direct)',

    CONSTRAINT "PageViewEvent_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "LinkViewEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "viewId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "documentId" TEXT,
    "dataroomId" TEXT,
    "continent" TEXT NOT NULL DEFAULT 'Unknown',
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "region" TEXT NOT NULL DEFAULT 'Unknown',
    "latitude" TEXT NOT NULL DEFAULT 'Unknown',
    "longitude" TEXT NOT NULL DEFAULT 'Unknown',
    "device" TEXT NOT NULL DEFAULT 'Desktop',
    "deviceModel" TEXT NOT NULL DEFAULT 'Unknown',
    "deviceVendor" TEXT NOT NULL DEFAULT 'Unknown',
    "browser" TEXT NOT NULL DEFAULT 'Unknown',
    "browserVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "os" TEXT NOT NULL DEFAULT 'Unknown',
    "osVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "engine" TEXT NOT NULL DEFAULT 'Unknown',
    "engineVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "cpuArchitecture" TEXT NOT NULL DEFAULT 'Unknown',
    "ua" TEXT NOT NULL DEFAULT 'Unknown',
    "bot" BOOLEAN NOT NULL DEFAULT false,
    "referer" TEXT NOT NULL DEFAULT '(direct)',
    "refererUrl" TEXT NOT NULL DEFAULT '(direct)',

    CONSTRAINT "LinkViewEvent_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "dataroomId" TEXT,
    "viewId" TEXT NOT NULL,
    "pageNumber" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "href" TEXT NOT NULL,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "VideoEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "linkId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "dataroomId" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "eventType" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL DEFAULT 0,
    "playbackRate" INTEGER NOT NULL DEFAULT 100,
    "volume" INTEGER NOT NULL DEFAULT 100,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isFocused" BOOLEAN NOT NULL DEFAULT true,
    "isFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "region" TEXT NOT NULL DEFAULT 'Unknown',
    "latitude" TEXT NOT NULL DEFAULT 'Unknown',
    "longitude" TEXT NOT NULL DEFAULT 'Unknown',
    "ua" TEXT NOT NULL DEFAULT 'Unknown',
    "browser" TEXT NOT NULL DEFAULT 'Unknown',
    "browserVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "engine" TEXT NOT NULL DEFAULT 'Unknown',
    "engineVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "os" TEXT NOT NULL DEFAULT 'Unknown',
    "osVersion" TEXT NOT NULL DEFAULT 'Unknown',
    "device" TEXT NOT NULL DEFAULT 'Desktop',
    "deviceVendor" TEXT NOT NULL DEFAULT 'Unknown',
    "deviceModel" TEXT NOT NULL DEFAULT 'Unknown',
    "cpuArchitecture" TEXT NOT NULL DEFAULT 'Unknown',
    "bot" BOOLEAN NOT NULL DEFAULT false,
    "referer" TEXT NOT NULL DEFAULT '(direct)',
    "refererUrl" TEXT NOT NULL DEFAULT '(direct)',

    CONSTRAINT "VideoEvent_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhookId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "requestBody" TEXT NOT NULL,
    "responseBody" TEXT NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "PageViewEvent_documentId_viewId_idx" ON "PageViewEvent"("documentId", "viewId");
-- CreateIndex
CREATE INDEX "PageViewEvent_documentId_time_idx" ON "PageViewEvent"("documentId", "time");
-- CreateIndex
CREATE INDEX "PageViewEvent_linkId_time_idx" ON "PageViewEvent"("linkId", "time");
-- CreateIndex
CREATE INDEX "PageViewEvent_viewId_idx" ON "PageViewEvent"("viewId");
-- CreateIndex
CREATE INDEX "PageViewEvent_time_idx" ON "PageViewEvent"("time");
-- CreateIndex
CREATE INDEX "LinkViewEvent_viewId_idx" ON "LinkViewEvent"("viewId");
-- CreateIndex
CREATE INDEX "LinkViewEvent_documentId_timestamp_idx" ON "LinkViewEvent"("documentId", "timestamp");
-- CreateIndex
CREATE INDEX "LinkViewEvent_linkId_timestamp_idx" ON "LinkViewEvent"("linkId", "timestamp");
-- CreateIndex
CREATE INDEX "LinkViewEvent_timestamp_idx" ON "LinkViewEvent"("timestamp");
-- CreateIndex
CREATE INDEX "ClickEvent_documentId_viewId_idx" ON "ClickEvent"("documentId", "viewId");
-- CreateIndex
CREATE INDEX "ClickEvent_timestamp_idx" ON "ClickEvent"("timestamp");
-- CreateIndex
CREATE INDEX "VideoEvent_documentId_viewId_idx" ON "VideoEvent"("documentId", "viewId");
-- CreateIndex
CREATE INDEX "VideoEvent_documentId_timestamp_idx" ON "VideoEvent"("documentId", "timestamp");
-- CreateIndex
CREATE INDEX "VideoEvent_timestamp_idx" ON "VideoEvent"("timestamp");
-- CreateIndex
CREATE INDEX "WebhookEvent_webhookId_timestamp_idx" ON "WebhookEvent"("webhookId", "timestamp");
-- CreateIndex
CREATE INDEX "WebhookEvent_timestamp_idx" ON "WebhookEvent"("timestamp");

-- Self-hosted fork: there are no plan tiers. New teams default to the full
-- feature set and existing free-plan rows are lifted to it.
ALTER TABLE "Team" ALTER COLUMN "plan" SET DEFAULT 'business';
UPDATE "Team" SET "plan" = 'business' WHERE "plan" LIKE 'free%';
