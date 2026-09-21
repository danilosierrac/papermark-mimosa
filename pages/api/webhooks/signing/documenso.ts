import { NextApiRequest, NextApiResponse } from "next";

import {
  findAgreementResponseByExternalId,
  syncAgreementResponseWithSigningDocument,
  verifySigningWebhookSecret,
} from "@/lib/signing/agreements";

// Push-based completion instead of relying on the visitor's browser calling
// /api/agreements/signing/complete after the embedded flow: that client
// callback can be missed (closed tab, network drop, signed via an emailed
// Documenso link outside our iframe), leaving the response stuck at PENDING
// until someone manually hits "sync" in the dashboard. This receives
// Documenso's server-to-server webhook instead, so completion lands within
// seconds regardless of what the visitor's browser does.
//
// Registered in Documenso's dashboard (Team settings -> Webhooks), not via
// API -- their webhook management isn't exposed there. Verification is a
// plain constant-time string compare against the `X-Documenso-Secret`
// header, per Documenso's docs; not an HMAC of the body.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const secretHeader = req.headers["x-documenso-secret"];
  const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;
  const { ok, configured } = verifySigningWebhookSecret(secret);

  if (!configured) {
    console.error("[signing webhook] SIGNING_WEBHOOK_SECRET is not set");
    return res.status(500).end();
  }

  if (!ok) {
    return res.status(401).end();
  }

  try {
    const body = req.body as {
      event?: string;
      payload?: {
        id?: number;
        externalId?: string | null;
      };
    };

    // Only the terminal event moves a response out of PENDING/SIGNED; other
    // event types (opened, sent, reminder…) aren't tracked here. Documenso's
    // dashboard labels triggers lowercase-dotted ("document.completed") while
    // their own docs show the payload's `event` field uppercase-underscored
    // ("DOCUMENT_COMPLETED") -- normalize instead of trusting either form.
    const normalizedEvent = body?.event
      ?.toUpperCase()
      .replace(/\./g, "_");

    if (normalizedEvent !== "DOCUMENT_COMPLETED") {
      console.log("[signing webhook] ignoring event", body?.event);
      return res.status(200).json({ ignored: true });
    }

    const documentId = body.payload?.id;
    const externalId = body.payload?.externalId;

    if (typeof documentId !== "number" || !externalId) {
      return res.status(200).json({ ignored: true });
    }

    const existingResponse =
      await findAgreementResponseByExternalId(externalId);

    if (!existingResponse) {
      // Not one of ours (or already deleted) -- not an error, just nothing to do.
      return res.status(200).json({ ignored: true });
    }

    await syncAgreementResponseWithSigningDocument({
      agreementResponseId: existingResponse.id,
      documentId,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[signing webhook] failed to process event", error);
    // 200 rather than 5xx: a malformed/unexpected payload will just keep
    // failing on retry, and the dashboard's manual "sync" stays as a fallback.
    return res.status(200).json({ ok: false });
  }
}
