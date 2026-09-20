import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

// Read queries over the view analytics tables. Each function keeps the name,
// parameters and `{ data, rows }` result shape of the hosted analytics pipe
// it replaces, so call sites only changed their import.
//
// The pipes took comma-separated id lists and `since`/`until` as unix
// milliseconds; both conventions are preserved here.

type Result<T> = { data: T[]; rows: number };

const wrap = <T>(data: T[]): Result<T> => ({ data, rows: data.length });

/** The old pipes split '' into ['']; drop empties here instead. */
function idList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : value.split(",");
  return items.map((v) => v.trim()).filter(Boolean);
}

const FAR_FUTURE_MS = 9999999999999;
const sinceDate = (since?: number) => new Date(since ?? 0);
const untilDate = (until?: number) => new Date(until ?? FAR_FUTURE_MS);

/** Sort page numbers numerically ("2" before "10"). */
const byPageNumber = (a: { pageNumber: string }, b: { pageNumber: string }) =>
  Number(a.pageNumber) - Number(b.pageNumber);

// ---------------------------------------------------------------------------
// Page views / durations
// ---------------------------------------------------------------------------

/**
 * Average time spent per page across visits: sum per (version, page, visit),
 * then average per (version, page). Former `get_total_average_page_duration__v5`.
 */
export async function getTotalAvgPageDuration(params: {
  documentId: string;
  excludedLinkIds: string;
  excludedViewIds: string;
  since: number;
  until?: number;
}): Promise<Result<{ versionNumber: number; pageNumber: string; avg_duration: number }>> {
  const excludedLinkIds = idList(params.excludedLinkIds);
  const excludedViewIds = idList(params.excludedViewIds);
  const rows = await prisma.$queryRaw<
    { versionNumber: number; pageNumber: string; avg_duration: number }[]
  >`
    SELECT "versionNumber", "pageNumber", AVG(distinct_duration)::float AS avg_duration
    FROM (
      SELECT "versionNumber", "pageNumber", "viewId", SUM(duration) AS distinct_duration
      FROM "PageViewEvent"
      WHERE "documentId" = ${params.documentId}
        AND time >= ${sinceDate(params.since)}
        AND time <= ${untilDate(params.until)}
        AND "linkId" <> ALL(${excludedLinkIds}::text[])
        AND "viewId" <> ALL(${excludedViewIds}::text[])
      GROUP BY "versionNumber", "pageNumber", "viewId"
    ) per_view
    GROUP BY "versionNumber", "pageNumber"
  `;
  const data = rows
    .map((r) => ({
      versionNumber: Number(r.versionNumber),
      pageNumber: r.pageNumber,
      avg_duration: Number(r.avg_duration),
    }))
    .sort((a, b) => a.versionNumber - b.versionNumber || byPageNumber(a, b));
  return wrap(data);
}

/** Time spent per page in one visit. Former `get_page_duration_per_view__v5`. */
export async function getViewPageDuration(params: {
  documentId: string;
  viewId: string;
  since: number;
  until?: number;
}): Promise<Result<{ pageNumber: string; sum_duration: number }>> {
  const groups = await prisma.pageViewEvent.groupBy({
    by: ["pageNumber"],
    where: {
      documentId: params.documentId,
      viewId: params.viewId,
      time: { gte: sinceDate(params.since), lte: untilDate(params.until) },
    },
    _sum: { duration: true },
  });
  const data = groups
    .map((g) => ({ pageNumber: g.pageNumber, sum_duration: g._sum.duration ?? 0 }))
    .sort(byPageNumber);
  return wrap(data);
}

/**
 * Distinct pages seen per visit (for completion rate). Former
 * `get_view_completion_stats__v1`.
 */
export async function getViewCompletionStats(params: {
  documentId: string;
  excludedViewIds: string;
  since: number;
}): Promise<Result<{ viewId: string; versionNumber: number; pages_viewed: number }>> {
  const excludedViewIds = idList(params.excludedViewIds);
  const rows = await prisma.$queryRaw<
    { viewId: string; versionNumber: number; pages_viewed: number }[]
  >`
    SELECT "viewId", "versionNumber", COUNT(DISTINCT "pageNumber")::int AS pages_viewed
    FROM "PageViewEvent"
    WHERE "documentId" = ${params.documentId}
      AND "viewId" <> ALL(${excludedViewIds}::text[])
      AND time >= ${sinceDate(params.since)}
    GROUP BY "viewId", "versionNumber"
  `;
  return wrap(
    rows.map((r) => ({
      viewId: r.viewId,
      versionNumber: Number(r.versionNumber),
      pages_viewed: Number(r.pages_viewed),
    })),
  );
}

/** Total time spent on a document. Former `get_total_document_duration__v1`. */
export async function getTotalDocumentDuration(params: {
  documentId: string;
  excludedLinkIds: string;
  excludedViewIds: string;
  since: number;
  until?: number;
}): Promise<Result<{ sum_duration: number }>> {
  const agg = await prisma.pageViewEvent.aggregate({
    where: {
      documentId: params.documentId,
      time: { gte: sinceDate(params.since), lte: untilDate(params.until) },
      linkId: { notIn: idList(params.excludedLinkIds) },
      viewId: { notIn: idList(params.excludedViewIds) },
    },
    _sum: { duration: true },
  });
  return wrap([{ sum_duration: agg._sum.duration ?? 0 }]);
}

/**
 * Total time and distinct visits for one link. Former
 * `get_total_link_duration__v1`.
 */
export async function getTotalLinkDuration(params: {
  linkId: string;
  documentId: string;
  excludedViewIds: string;
  since: number;
  until?: number;
}): Promise<Result<{ sum_duration: number; view_count: number }>> {
  const excludedViewIds = idList(params.excludedViewIds);
  const rows = await prisma.$queryRaw<
    { sum_duration: number | null; view_count: number }[]
  >`
    SELECT COALESCE(SUM(duration), 0)::float AS sum_duration,
           COUNT(DISTINCT "viewId")::int AS view_count
    FROM "PageViewEvent"
    WHERE "linkId" = ${params.linkId}
      AND "documentId" = ${params.documentId}
      AND time >= ${sinceDate(params.since)}
      AND time <= ${untilDate(params.until)}
      AND "viewId" <> ALL(${excludedViewIds}::text[])
  `;
  const r = rows[0];
  return wrap([
    { sum_duration: Number(r?.sum_duration ?? 0), view_count: Number(r?.view_count ?? 0) },
  ]);
}

/** Total time across a set of visits. Former `get_total_viewer_duration__v1`. */
export async function getTotalViewerDuration(params: {
  viewIds: string;
  since: number;
  until?: number;
}): Promise<Result<{ sum_duration: number }>> {
  const viewIds = idList(params.viewIds);
  if (viewIds.length === 0) return wrap([{ sum_duration: 0 }]);
  const agg = await prisma.pageViewEvent.aggregate({
    where: {
      viewId: { in: viewIds },
      time: { gte: sinceDate(params.since), lte: untilDate(params.until) },
    },
    _sum: { duration: true },
  });
  return wrap([{ sum_duration: agg._sum.duration ?? 0 }]);
}

/**
 * Total time one viewer spent on one document across their visits. Former
 * `get_document_duration_per_viewer__v1`.
 */
export async function getDocumentDurationPerViewer(params: {
  documentId: string;
  viewIds: string;
}): Promise<Result<{ sum_duration: number }>> {
  const viewIds = idList(params.viewIds);
  if (viewIds.length === 0) return wrap([{ sum_duration: 0 }]);
  const agg = await prisma.pageViewEvent.aggregate({
    where: { documentId: params.documentId, viewId: { in: viewIds } },
    _sum: { duration: true },
  });
  return wrap([{ sum_duration: agg._sum.duration ?? 0 }]);
}

/**
 * Total time and set of visitor countries for a team's documents in a
 * period. Former `get_total_team_duration__v1` (the old pipe used an
 * approximate distinct; Postgres counts exactly).
 */
export async function getTotalTeamDuration(params: {
  documentIds: string;
  since: number;
  until: number;
}): Promise<Result<{ total_duration: number; unique_countries: string[] }>> {
  const documentIds = idList(params.documentIds);
  if (documentIds.length === 0) {
    return wrap([{ total_duration: 0, unique_countries: [] }]);
  }
  const [agg, countries] = await Promise.all([
    prisma.pageViewEvent.aggregate({
      where: {
        documentId: { in: documentIds },
        time: { gte: sinceDate(params.since), lt: untilDate(params.until) },
      },
      _sum: { duration: true },
    }),
    prisma.linkViewEvent.findMany({
      where: {
        documentId: { in: documentIds },
        timestamp: { gte: sinceDate(params.since), lt: untilDate(params.until) },
        country: { notIn: ["Unknown", ""] },
      },
      distinct: ["country"],
      select: { country: true },
    }),
  ]);
  return wrap([
    {
      total_duration: agg._sum.duration ?? 0,
      unique_countries: countries.map((c) => c.country),
    },
  ]);
}

// ---------------------------------------------------------------------------
// User agent
// ---------------------------------------------------------------------------

type UserAgentRow = {
  country: string;
  city: string;
  browser: string;
  os: string;
  device: string;
};

/** Device/location of a visit from its link-open event. Former `get_useragent_per_view__v3`. */
export async function getViewUserAgent(params: {
  viewId: string;
}): Promise<Result<UserAgentRow>> {
  const row = await prisma.linkViewEvent.findFirst({
    where: { viewId: params.viewId },
    orderBy: { timestamp: "asc" },
    select: { country: true, city: true, browser: true, os: true, device: true },
  });
  return wrap(row ? [row] : []);
}

/**
 * Device/location of a visit from its first page view (fallback for visits
 * recorded before link-open events existed). Former `get_useragent_per_view__v2`.
 */
export async function getViewUserAgent_v2(params: {
  documentId: string;
  viewId: string;
  since: number;
}): Promise<Result<UserAgentRow>> {
  const row = await prisma.pageViewEvent.findFirst({
    where: {
      documentId: params.documentId,
      viewId: params.viewId,
      time: { gte: sinceDate(params.since) },
    },
    orderBy: { time: "asc" },
    select: { country: true, city: true, browser: true, os: true, device: true },
  });
  return wrap(row ? [row] : []);
}

// ---------------------------------------------------------------------------
// Clicks, video, webhooks
// ---------------------------------------------------------------------------

/** In-document link clicks for one visit. Former `get_click_events_by_view__v1`. */
export async function getClickEventsByView(params: {
  document_id: string;
  view_id: string;
}): Promise<
  Result<{
    timestamp: string;
    document_id: string;
    dataroom_id: string | null;
    view_id: string;
    page_number: string;
    version_number: number;
    href: string;
  }>
> {
  const rows = await prisma.clickEvent.findMany({
    where: { documentId: params.document_id, viewId: params.view_id },
    orderBy: { timestamp: "asc" },
  });
  return wrap(
    rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      document_id: r.documentId,
      dataroom_id: r.dataroomId,
      view_id: r.viewId,
      page_number: r.pageNumber,
      version_number: r.versionNumber,
      href: r.href,
    })),
  );
}

type VideoEventRow = {
  timestamp: string;
  view_id: string;
  event_type: string;
  start_time: number;
  end_time: number;
  playback_rate: number;
  volume: number;
  is_muted: number;
  is_focused: number;
  is_fullscreen: number;
};

const toVideoEventRow = (r: {
  timestamp: Date;
  viewId: string;
  eventType: string;
  startTime: number;
  endTime: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isFocused: boolean;
  isFullscreen: boolean;
}): VideoEventRow => ({
  timestamp: r.timestamp.toISOString(),
  view_id: r.viewId,
  event_type: r.eventType,
  start_time: r.startTime,
  end_time: r.endTime,
  playback_rate: r.playbackRate,
  volume: r.volume,
  is_muted: r.isMuted ? 1 : 0,
  is_focused: r.isFocused ? 1 : 0,
  is_fullscreen: r.isFullscreen ? 1 : 0,
});

/** All playback events for a video document. Former `get_video_events_by_document__v1`. */
export async function getVideoEventsByDocument(params: {
  document_id: string;
}): Promise<Result<VideoEventRow>> {
  const rows = await prisma.videoEvent.findMany({
    where: { documentId: params.document_id },
    orderBy: { timestamp: "asc" },
  });
  return wrap(rows.map(toVideoEventRow));
}

/** Playback events for one visit. Former `get_video_events_by_view__v1`. */
export async function getVideoEventsByView(params: {
  document_id: string;
  view_id: string;
}): Promise<Result<VideoEventRow>> {
  const rows = await prisma.videoEvent.findMany({
    where: { documentId: params.document_id, viewId: params.view_id },
    orderBy: { timestamp: "asc" },
  });
  return wrap(rows.map(toVideoEventRow));
}

/** Last 100 deliveries of a webhook. Former `get_webhook_events__v1`. */
export async function getWebhookEvents(params: { webhookId: string }): Promise<
  Result<{
    event_id: string;
    webhook_id: string;
    message_id: string;
    event: string;
    url: string;
    http_status: number;
    request_body: string;
    response_body: string;
    timestamp: string;
  }>
> {
  const rows = await prisma.webhookEvent.findMany({
    where: { webhookId: params.webhookId },
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return wrap(
    rows.map((r) => ({
      event_id: r.id,
      webhook_id: r.webhookId,
      message_id: r.messageId,
      event: r.event,
      url: r.url,
      http_status: r.httpStatus,
      request_body: r.requestBody,
      response_body: r.responseBody,
      timestamp: r.timestamp.toISOString(),
    })),
  );
}

export type { Prisma };
