import { NextApiRequest, NextApiResponse } from "next";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { getS3Client } from "@/lib/files/aws-client";
import { getStorageConfig } from "@/lib/files/storage-config";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Uploads a static, non-document asset (e.g. a licensed font binary) into the
// R2 bucket under `_static/`, using the production storage credentials that
// are only ever available server-side. Lets a local script push a file into
// R2 without ever having the R2 secret keys on this machine -- same
// internal-key gating as the other one-off job routes.
export default async function handler(
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

  const key = req.headers["x-asset-key"];
  const contentType = req.headers["content-type"];
  if (typeof key !== "string" || !key.startsWith("_static/") || !contentType) {
    res.status(400).json({ message: "Missing or invalid x-asset-key / content-type" });
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  const client = getS3Client();
  const { bucket } = getStorageConfig();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  res.status(200).json({ message: "ok", key, bytes: body.length });
}
