import { S3Store } from "@tus/s3-store";

import { getStorageConfig } from "./storage-config";

// tus resumable uploads land in the same S3-compatible bucket as everything
// else. Built lazily so importing the route does not require storage env vars.
export function createTusS3Store(): S3Store {
  const config = getStorageConfig();
  return new S3Store({
    partSize: 8 * 1024 * 1024, // 8 MiB per part
    s3ClientConfig: {
      bucket: config.bucket,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint
        ? { endpoint: config.endpoint, forcePathStyle: true }
        : {}),
    },
  });
}
