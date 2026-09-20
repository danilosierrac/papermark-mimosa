// Single-region S3-compatible storage, configured from environment variables.
// The upstream fork could route teams to a second region; this fork has one
// bucket and one endpoint.

export interface StorageConfig {
  bucket: string;
  advancedBucket?: string;
  archiveBucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  distributionHost?: string;
  advancedDistributionHost?: string;
  distributionKeyId?: string;
  distributionKeyContents?: string;
  lambdaFunctionName?: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getStorageConfig(_storageRegion?: string): StorageConfig {
  const bucket = required("NEXT_PRIVATE_UPLOAD_BUCKET");
  return {
    bucket,
    advancedBucket: process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_BUCKET,
    // One bucket is enough for a self-hosted install; a separate archive
    // bucket is optional.
    archiveBucket: process.env.NEXT_PRIVATE_ARCHIVE_BUCKET || bucket,
    region: process.env.NEXT_PRIVATE_UPLOAD_REGION || "eu-central-1",
    accessKeyId: required("NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID"),
    secretAccessKey: required("NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY"),
    endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT || undefined,
    distributionHost: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST,
    advancedDistributionHost:
      process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST,
    distributionKeyId: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_ID,
    distributionKeyContents:
      process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_CONTENTS,
    lambdaFunctionName: process.env.NEXT_PRIVATE_LAMBDA_FUNCTION_NAME,
  };
}

export async function getTeamStorageConfigById(
  _teamId: string,
): Promise<StorageConfig> {
  return getStorageConfig();
}
