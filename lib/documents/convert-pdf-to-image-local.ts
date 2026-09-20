import prisma from "@/lib/prisma";
import { getFile } from "@/lib/files/get-file";
import { ONE_HOUR } from "@/lib/constants";

/**
 * Local-dev stand-in for lib/trigger/pdf-to-image-route.ts, minus the
 * Trigger.dev job wrapper (logger/updateStatus/retries). Same two internal
 * mupdf API routes, called directly and fire-and-forget so document
 * creation doesn't wait on it. Only used when TRIGGER_SECRET_KEY is unset.
 */
export async function convertPdfToImageLocal(payload: {
  documentId: string;
  documentVersionId: string;
  teamId: string;
}) {
  const { documentId, documentVersionId, teamId } = payload;

  try {
    const documentVersion = await prisma.documentVersion.findUnique({
      where: { id: documentVersionId },
      select: { file: true, storageType: true, numPages: true },
    });
    if (!documentVersion) return;

    const signedUrl = await getFile({
      type: documentVersion.storageType,
      data: documentVersion.file,
      expiresIn: ONE_HOUR,
    });
    if (!signedUrl) return;

    const pagesRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/mupdf/get-pages`,
      {
        method: "POST",
        body: JSON.stringify({ url: signedUrl }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
      },
    );
    if (!pagesRes.ok) {
      console.error(
        "[local pdf conversion] get-pages failed",
        await pagesRes.text(),
      );
      return;
    }
    const { numPages } = (await pagesRes.json()) as { numPages: number };
    if (!numPages || numPages < 1) return;

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const pageRes = await fetch(
        `${process.env.NEXTAUTH_URL}/api/mupdf/convert-page`,
        {
          method: "POST",
          body: JSON.stringify({
            documentVersionId,
            pageNumber,
            url: signedUrl,
            teamId,
            trustedTeam: false,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          },
        },
      );
      if (!pageRes.ok) {
        console.error(
          `[local pdf conversion] page ${pageNumber} failed`,
          await pageRes.text(),
        );
        return;
      }
    }

    await prisma.documentVersion.update({
      where: { id: documentVersionId },
      data: { numPages, hasPages: true, isPrimary: true },
    });

    console.log(
      `[local pdf conversion] document ${documentId} converted (${numPages} pages)`,
    );
  } catch (error) {
    console.error("[local pdf conversion] failed", error);
  }
}
