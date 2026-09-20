import prisma from "@/lib/prisma";

/**
 * View and click events are kept for 12 months, then deleted. Override with
 * EVENT_RETENTION_DAYS if a deployment ever needs a different window.
 */
export const DEFAULT_EVENT_RETENTION_DAYS = 365;

export function eventRetentionDays(): number {
  const fromEnv = Number(process.env.EVENT_RETENTION_DAYS);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? Math.floor(fromEnv)
    : DEFAULT_EVENT_RETENTION_DAYS;
}

export async function deleteExpiredEvents(
  retentionDays: number = eventRetentionDays(),
) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [pageViews, linkViews, clicks, videoEvents, webhookEvents] =
    await Promise.all([
      prisma.pageViewEvent.deleteMany({ where: { time: { lt: cutoff } } }),
      prisma.linkViewEvent.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      prisma.clickEvent.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      prisma.videoEvent.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      prisma.webhookEvent.deleteMany({ where: { timestamp: { lt: cutoff } } }),
    ]);

  return {
    cutoff,
    retentionDays,
    deleted: {
      pageViews: pageViews.count,
      linkViews: linkViews.count,
      clicks: clicks.count,
      videoEvents: videoEvents.count,
      webhookEvents: webhookEvents.count,
    },
  };
}
