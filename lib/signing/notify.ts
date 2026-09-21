import AgreementSigned from "@/components/emails/agreement-signed";

import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";

import { getEnvelopeSignedDownloadUrl } from "./envelopes";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // Resend's practical attachment ceiling.

const buildAttachmentFilename = (agreementName: string) => {
  const safeName =
    agreementName
      .replace(/[^a-z0-9\-_]/gi, "_")
      .toLowerCase()
      .substring(0, 50) || "agreement";
  return `${safeName}_signed.pdf`;
};

const fetchSignedPdfBytes = async ({
  envelopeId,
  documentId,
}: {
  envelopeId: string;
  documentId: number | null;
}): Promise<Buffer | null> => {
  try {
    const { url } = await getEnvelopeSignedDownloadUrl({
      envelopeId,
      documentId,
    });
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_ATTACHMENT_BYTES) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_ATTACHMENT_BYTES) return null;

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[signing] failed to fetch signed PDF for email", error);
    return null;
  }
};

/**
 * Emails both sides a copy of the signed document (with Documenso's
 * certificate/audit page already baked in) the moment a signature
 * completes. Documenso's own notification emails are suppressed
 * (distributionMethod: "NONE" at document creation) since they'd carry
 * Documenso's own branding, not mimosa's -- this replaces them. Best-effort:
 * a failure here never blocks or reverts the signing completion itself.
 */
export const notifyAgreementSigned = async ({
  agreementId,
  agreementName,
  teamId,
  signerEmail,
  signerName,
  signingEnvelopeId,
  signingDocumentId,
}: {
  agreementId: string;
  agreementName: string;
  teamId: string;
  signerEmail?: string | null;
  signerName?: string | null;
  signingEnvelopeId: string | null;
  signingDocumentId: number | null;
}) => {
  if (!signingEnvelopeId) return;

  try {
    const pdfBytes = await fetchSignedPdfBytes({
      envelopeId: signingEnvelopeId,
      documentId: signingDocumentId,
    });
    if (!pdfBytes) return;

    const filename = buildAttachmentFilename(agreementName);
    const attachments = [{ filename, content: pdfBytes }];

    const teamMembers = await prisma.userTeam.findMany({
      where: { teamId, status: "ACTIVE" },
      select: { user: { select: { email: true } } },
    });
    const teamEmails = [
      ...new Set(
        teamMembers
          .map((m) => m.user.email)
          .filter((email): email is string => !!email),
      ),
    ];

    const sends: Promise<unknown>[] = [];

    if (signerEmail) {
      sends.push(
        sendEmail({
          to: signerEmail,
          subject: `Your signed copy of ${agreementName}`,
          react: AgreementSigned({
            agreementName,
            signerName,
            signerEmail,
            recipientRole: "signer",
          }),
          attachments,
        }),
      );
    }

    for (const teamEmail of teamEmails) {
      if (teamEmail.toLowerCase() === signerEmail?.toLowerCase()) continue;
      sends.push(
        sendEmail({
          to: teamEmail,
          subject: `${signerName || signerEmail || "Someone"} signed ${agreementName}`,
          react: AgreementSigned({
            agreementName,
            signerName,
            signerEmail,
            recipientRole: "team",
          }),
          attachments,
        }),
      );
    }

    await Promise.allSettled(sends);
  } catch (error) {
    console.error("[signing] notifyAgreementSigned failed", error);
  }
};
