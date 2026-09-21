import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@/lib/prisma";

// Temporary debug helper to find a recent view's id for manual testing.
// Gated by INTERNAL_API_KEY like the other job routes. Remove once no
// longer needed.
export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { documentId } = req.query as { documentId?: string };

  const view = await prisma.view.findFirst({
    where: documentId ? { documentId } : undefined,
    orderBy: { viewedAt: "desc" },
    select: { id: true, documentId: true, viewerEmail: true, viewedAt: true },
  });

  res.status(200).json({ view });
}
