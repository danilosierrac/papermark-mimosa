import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@/lib/prisma";

// One-time setup helper: this fork's Integration table was never seeded, but
// the Slack integration code looks up InstalledIntegration rows by a fixed
// Integration.id (SLACK_INTEGRATION_ID). Upserting by slug here gives us
// that id once, to paste into the env var. Safe to leave in place —
// idempotent, and gated the same way as the other internal job routes.
export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const integration = await prisma.integration.upsert({
    where: { slug: "slack" },
    update: {},
    create: {
      slug: "slack",
      name: "Slack",
      developer: "mimosa",
      website: "https://slack.com",
      verified: true,
    },
  });

  res.status(200).json({ id: integration.id });
}
