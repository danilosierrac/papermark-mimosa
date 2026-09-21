import { NextApiRequest, NextApiResponse } from "next";

import { convertPdfToImageLocal } from "@/lib/documents/convert-pdf-to-image-local";
import prisma from "@/lib/prisma";

// Recovery for documents left stuck (hasPages never set) after a transient
// failure mid-conversion — e.g. a DB connection blip on one page write,
// with no retry elsewhere in the pipeline. Re-runs conversion for the
// document's primary version. Gated the same way as the other job routes.
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

  const { documentId } = req.body as { documentId: string };
  if (!documentId) {
    res.status(400).json({ message: "documentId is required" });
    return;
  }

  const version = await prisma.documentVersion.findFirst({
    where: { documentId, isPrimary: true },
    select: { id: true, document: { select: { teamId: true } } },
  });

  if (!version || !version.document.teamId) {
    res.status(404).json({ message: "Document version not found" });
    return;
  }

  await convertPdfToImageLocal({
    documentId,
    documentVersionId: version.id,
    teamId: version.document.teamId,
  });

  const refreshed = await prisma.documentVersion.findUnique({
    where: { id: version.id },
    select: { hasPages: true, numPages: true },
  });

  res.status(200).json({ documentVersionId: version.id, ...refreshed });
}
