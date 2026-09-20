import { tenant } from "@teamhanko/passkeys-next-auth-provider";

// Passkey login is optional. Without real Hanko credentials, export a
// disabled tenant instead of throwing at import time and taking down every
// route that happens to import this module (e.g. Slack OAuth).
const hankoConfigured =
  !!process.env.HANKO_API_KEY &&
  process.env.HANKO_API_KEY !== "add-your-hanko-api-key" &&
  !!process.env.NEXT_PUBLIC_HANKO_TENANT_ID &&
  process.env.NEXT_PUBLIC_HANKO_TENANT_ID !== "add-your-hanko-tenent-id";

const hanko = hankoConfigured
  ? tenant({
      apiKey: process.env.HANKO_API_KEY!,
      tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID!,
    })
  : (tenant({ apiKey: "disabled", tenantId: "disabled" }) as ReturnType<
      typeof tenant
    >);

export default hanko;
