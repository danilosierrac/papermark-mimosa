import { NextApiRequest, NextApiResponse } from "next";

import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getS3Client } from "@/lib/files/aws-client";
import { getStorageConfig } from "@/lib/files/storage-config";

// Licensed font binaries can't be committed to this public repo, so they
// live in the private R2 bucket instead (uploaded once via a local script)
// and are streamed from here with a long, immutable cache lifetime.
const ALLOWED_FONTS: Record<string, string> = {
  "PPMori-Regular.woff2": "font/woff2",
  "PPMori-Regular.woff": "font/woff",
  "PPMori-Semibold.woff2": "font/woff2",
  "PPMori-Semibold.woff": "font/woff",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const file = req.query.file as string;
  const contentType = ALLOWED_FONTS[file];
  if (!contentType) {
    res.status(404).end();
    return;
  }

  try {
    const client = getS3Client();
    const { bucket } = getStorageConfig();
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: `_static/fonts/${file}` }),
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const body = object.Body as NodeJS.ReadableStream;
    body.pipe(res);
  } catch (error) {
    console.error("Error streaming font:", error);
    res.status(404).end();
  }
}
