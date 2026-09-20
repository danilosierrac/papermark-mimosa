/**
 * Delete view analytics events older than the retention window (365 days).
 *
 * Run from cron on the host that has database access, once a day:
 *
 *   npx tsx scripts/cleanup-view-events.ts
 *
 * Needs POSTGRES_PRISMA_URL (and POSTGRES_PRISMA_URL_NON_POOLING) in the
 * environment, like the app itself. The same job also exists as a trigger.dev
 * schedule in lib/trigger/cleanup-view-events.ts; use one or the other.
 */
import prisma from "@/lib/prisma";
import { deleteExpiredEvents } from "@/lib/events/retention";

async function main() {
  const result = await deleteExpiredEvents();
  console.log(
    `Deleted events older than ${result.cutoff.toISOString()} ` +
      `(${result.retentionDays} days):`,
    result.deleted,
  );
}

main()
  .catch((error) => {
    console.error("View event cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
