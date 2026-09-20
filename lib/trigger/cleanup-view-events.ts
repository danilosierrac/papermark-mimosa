import { logger, schedules } from "@trigger.dev/sdk";

import { deleteExpiredEvents } from "@/lib/events/retention";

/**
 * Daily retention job: deletes view, link-open, click, video and webhook
 * events older than 365 days (see lib/events/retention.ts). Deployments
 * without trigger.dev run scripts/cleanup-view-events.ts from cron instead.
 */
export const cleanupViewEvents = schedules.task({
  id: "cleanup-view-events",
  // Run daily at 03:00 UTC
  cron: "0 3 * * *",
  run: async (payload) => {
    logger.info("Deleting view events past retention", {
      timestamp: payload.timestamp,
    });
    const result = await deleteExpiredEvents();
    logger.info("View event cleanup completed", result);
    return result;
  },
});
