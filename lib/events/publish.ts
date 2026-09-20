import { z } from "zod";

import { VIDEO_EVENT_TYPES } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";

// Ingest functions for view analytics events. Same event shapes as the
// former hosted ingest endpoints, validated with the same Zod schemas,
// written to Postgres. No field for an IP address exists on purpose.

const geoAndDeviceFields = {
  country: z.string().optional().default("Unknown"),
  city: z.string().optional().default("Unknown"),
  region: z.string().optional().default("Unknown"),
  latitude: z.string().optional().default("Unknown"),
  longitude: z.string().optional().default("Unknown"),
  ua: z.string().optional().default("Unknown"),
  browser: z.string().optional().default("Unknown"),
  browser_version: z.string().optional().default("Unknown"),
  engine: z.string().optional().default("Unknown"),
  engine_version: z.string().optional().default("Unknown"),
  os: z.string().optional().default("Unknown"),
  os_version: z.string().optional().default("Unknown"),
  device: z.string().optional().default("Desktop"),
  device_vendor: z.string().optional().default("Unknown"),
  device_model: z.string().optional().default("Unknown"),
  cpu_architecture: z.string().optional().default("Unknown"),
  bot: z.boolean().optional(),
  referer: z.string().optional().default("(direct)"),
  referer_url: z.string().optional().default("(direct)"),
};

function mapGeoAndDevice(e: {
  country: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
  ua: string;
  browser: string;
  browser_version: string;
  engine: string;
  engine_version: string;
  os: string;
  os_version: string;
  device: string;
  device_vendor: string;
  device_model: string;
  cpu_architecture: string;
  bot?: boolean;
  referer: string;
  referer_url: string;
}) {
  return {
    country: e.country,
    city: e.city,
    region: e.region,
    latitude: e.latitude,
    longitude: e.longitude,
    ua: e.ua,
    browser: e.browser,
    browserVersion: e.browser_version,
    engine: e.engine,
    engineVersion: e.engine_version,
    os: e.os,
    osVersion: e.os_version,
    device: e.device,
    deviceVendor: e.device_vendor,
    deviceModel: e.device_model,
    cpuArchitecture: e.cpu_architecture,
    bot: e.bot ?? false,
    referer: e.referer,
    refererUrl: e.referer_url,
  };
}

export const pageViewEventSchema = z.object({
  id: z.string(),
  linkId: z.string(),
  documentId: z.string(),
  viewId: z.string(),
  dataroomId: z.string().nullable().optional(),
  versionNumber: z.number().int().min(1).max(65535).optional().default(1),
  time: z.number().int(), // unix ms
  duration: z.number().int(),
  pageNumber: z.string(),
  ...geoAndDeviceFields,
});
export type PageViewEventInput = z.input<typeof pageViewEventSchema>;

/** One page-view heartbeat from the viewer. */
export async function publishPageView(input: PageViewEventInput) {
  const e = pageViewEventSchema.parse(input);
  await prisma.pageViewEvent.create({
    data: {
      id: e.id,
      linkId: e.linkId,
      documentId: e.documentId,
      viewId: e.viewId,
      dataroomId: e.dataroomId ?? null,
      versionNumber: e.versionNumber,
      time: new Date(e.time),
      duration: e.duration,
      pageNumber: e.pageNumber,
      ...mapGeoAndDevice(e),
    },
  });
  return { successful_rows: 1, quarantined_rows: 0 };
}

export const linkViewEventSchema = z.object({
  timestamp: z.string(),
  click_id: z.string(),
  view_id: z.string(),
  link_id: z.string(),
  document_id: z.string().nullable(),
  dataroom_id: z.string().nullable(),
  continent: z.string().optional().default("Unknown"),
  ...geoAndDeviceFields,
});
export type LinkViewEventInput = z.input<typeof linkViewEventSchema>;

/** A visitor opened a link (formerly `pm_click_events`). */
export async function recordLinkViewEvent(input: LinkViewEventInput) {
  const e = linkViewEventSchema.parse(input);
  await prisma.linkViewEvent.create({
    data: {
      id: e.click_id,
      timestamp: new Date(e.timestamp),
      viewId: e.view_id,
      linkId: e.link_id,
      documentId: e.document_id,
      dataroomId: e.dataroom_id,
      continent: e.continent || "Unknown",
      ...mapGeoAndDevice(e),
    },
  });
  return { successful_rows: 1, quarantined_rows: 0 };
}

export const clickEventSchema = z.object({
  timestamp: z.string(),
  event_id: z.string(),
  session_id: z.string(),
  link_id: z.string(),
  document_id: z.string(),
  view_id: z.string(),
  page_number: z.string(),
  href: z.string(),
  version_number: z.number(),
  dataroom_id: z.string().nullable(),
});
export type ClickEventInput = z.input<typeof clickEventSchema>;

/** A click on a link inside a document. */
export async function recordClickEvent(input: ClickEventInput) {
  const e = clickEventSchema.parse(input);
  await prisma.clickEvent.create({
    data: {
      id: e.event_id,
      timestamp: new Date(e.timestamp),
      sessionId: e.session_id,
      linkId: e.link_id,
      documentId: e.document_id,
      dataroomId: e.dataroom_id,
      viewId: e.view_id,
      pageNumber: e.page_number,
      versionNumber: e.version_number,
      href: e.href,
    },
  });
  return { successful_rows: 1, quarantined_rows: 0 };
}

export const videoEventSchema = z.object({
  timestamp: z.string(),
  id: z.string(),
  link_id: z.string(),
  document_id: z.string(),
  view_id: z.string(),
  dataroom_id: z.string().nullable(),
  version_number: z.number(),
  event_type: z.enum(VIDEO_EVENT_TYPES),
  start_time: z.number(),
  end_time: z.number().optional(),
  playback_rate: z.number(), // x100
  volume: z.number(), // 0-100
  is_muted: z.number(),
  is_focused: z.number(),
  is_fullscreen: z.number(),
  ...geoAndDeviceFields,
});
export type VideoEventInput = z.input<typeof videoEventSchema>;

/** A video playback event. */
export async function recordVideoView(input: VideoEventInput) {
  const e = videoEventSchema.parse(input);
  await prisma.videoEvent.create({
    data: {
      id: e.id,
      timestamp: new Date(e.timestamp),
      linkId: e.link_id,
      documentId: e.document_id,
      viewId: e.view_id,
      dataroomId: e.dataroom_id,
      versionNumber: e.version_number,
      eventType: e.event_type,
      startTime: Math.round(e.start_time),
      endTime: Math.round(e.end_time ?? 0),
      playbackRate: Math.round(e.playback_rate),
      volume: Math.round(e.volume),
      isMuted: e.is_muted === 1,
      isFocused: e.is_focused === 1,
      isFullscreen: e.is_fullscreen === 1,
      ...mapGeoAndDevice(e),
    },
  });
  return { successful_rows: 1, quarantined_rows: 0 };
}

export const webhookEventSchema = z.object({
  event_id: z.string(),
  webhook_id: z.string(),
  message_id: z.string(), // QStash message ID
  event: z.enum(WEBHOOK_TRIGGERS),
  url: z.string(),
  http_status: z.number(),
  request_body: z.string(),
  response_body: z.string(),
});
export type WebhookEventInput = z.input<typeof webhookEventSchema>;

/** Delivery log entry for an outgoing webhook. */
export async function recordWebhookEvent(input: WebhookEventInput) {
  const e = webhookEventSchema.parse(input);
  await prisma.webhookEvent.create({
    data: {
      id: e.event_id,
      webhookId: e.webhook_id,
      messageId: e.message_id,
      event: e.event,
      url: e.url,
      httpStatus: e.http_status,
      requestBody: e.request_body,
      responseBody: e.response_body,
    },
  });
  return { successful_rows: 1, quarantined_rows: 0 };
}
