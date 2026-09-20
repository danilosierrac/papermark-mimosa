import {
  resolveBaseBrand,
  teamBrandOgSelect,
  teamBrandViewerSelect,
} from "@/lib/brand/resolve-brand";
import { resolvePublicLinkMeta } from "@/lib/brand/resolve-brand";
import type { ResolvedPublicLinkMeta } from "@/lib/brand/resolve-brand";
import {
  Brand,
  DataroomBrand,
  ItemType,
  LinkAudienceType,
  LinkType,
  PermissionGroupAccessControls,
  Prisma,
  ViewerGroupAccessControls,
} from "@prisma/client";

import { getFeatureFlags } from "@/lib/featureFlags";
import prisma from "@/lib/prisma";
import { sortItemsByIndexAndName } from "@/lib/utils/sort-items-by-index-name";

// ============================================================================
// Types
// ============================================================================

type LinkFetchStatus =
  | "ok"
  | "not_found"
  | "archived"
  | "deleted"
  | "expired"
  | "free"
  | "frozen";

export type { ResolvedPublicLinkMeta };

export type LinkFetchResult =
  | {
      status: "ok";
      linkType: LinkType;
      link: any;
      brand: Partial<Brand> | Partial<DataroomBrand> | null;
      linkId?: string;
      publicMeta: ResolvedPublicLinkMeta;
      /** Server-only resolved flag for dataroom visitor views (not serialized onto link). */
      dataroomIndexEnabledForViewer?: boolean;
    }
  | {
      status: Exclude<LinkFetchStatus, "ok">;
    };

// Common select object for link queries
const linkSelect = {
  id: true,
  expiresAt: true,
  emailProtected: true,
  emailAuthenticated: true,
  allowDownload: true,
  enableFeedback: true,
  enableScreenshotProtection: true,
  enableConfidentialView: true,
  password: true,
  isArchived: true,
  deletedAt: true,
  enableIndexFile: true,
  enableCustomMetatag: true,
  metaTitle: true,
  metaDescription: true,
  metaImage: true,
  metaFavicon: true,
  welcomeMessage: true,
  brandId: true,
  enableQuestion: true,
  linkType: true,
  feedback: {
    select: {
      id: true,
      data: true,
    },
  },
  enableAgreement: true,
  agreement: true,
  showBanner: true,
  enableWatermark: true,
  watermarkConfig: true,
  groupId: true,
  permissionGroupId: true,
  audienceType: true,
  dataroomId: true,
  dataroom: {
    select: {
      brandId: true,
    },
  },
  teamId: true,
  team: {
    select: {
      plan: true,
      globalBlockList: true,
    },
  },
  customFields: {
    select: {
      id: true,
      type: true,
      identifier: true,
      label: true,
      placeholder: true,
      required: true,
      disabled: true,
      orderIndex: true,
    },
    orderBy: {
      orderIndex: "asc" as const,
    },
  },
} satisfies Prisma.LinkSelect;

// Type for the link record returned by the common select query
type LinkRecord = Prisma.LinkGetPayload<{ select: typeof linkSelect }>;

// ============================================================================
// Internal Helpers
// ============================================================================

// Helper function to get all parent folder IDs for given folder IDs
export async function fetchDocumentLinkData({
  linkId,
  teamId,
}: {
  linkId: string;
  teamId: string;
}) {
  const linkData = await prisma.link.findUnique({
    where: { id: linkId, teamId, deletedAt: null },
    select: {
      brandId: true,
      document: {
        select: {
          id: true,
          name: true,
          advancedExcelEnabled: true,
          downloadOnly: true,
          teamId: true,
          ownerId: true,
          team: {
            select: { plan: true },
          },
          versions: {
            where: { isPrimary: true },
            select: {
              id: true,
              versionNumber: true,
              type: true,
              hasPages: true,
              file: true,
              isVertical: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!linkData?.document || linkData.document.teamId !== teamId) {
    throw new Error("Document not found");
  }

  const brand = await resolveBaseBrand({
    teamId: linkData.document.teamId,
    linkBrandId: linkData.brandId,
    select: teamBrandViewerSelect,
  });

  return { linkData, brand };
}

// ============================================================================
// Unified Link Data Fetcher for getStaticProps
// Avoids internal HTTP fetch which can be blocked by Vercel edge (403 errors)
// ============================================================================

// Strip the URL unless the override applies, so the viewer can treat a present
// value as "use it".
async function applyPrivacyPolicyUrlVisibility<
  T extends Record<string, any> | null,
>(
  brand: T,
  {
    teamId,
    isCustomDomain,
  }: { teamId?: string | null; isCustomDomain?: boolean },
): Promise<T> {
  if (!brand || !brand.privacyPolicyUrl) return brand;

  if (isCustomDomain && teamId) {
    const featureFlags = await getFeatureFlags({ teamId });
    if (featureFlags.customPrivacyUrl) return brand;
  }

  return { ...brand, privacyPolicyUrl: null };
}

/**
 * Core function to process link data after fetching the link record.
 * Handles all link types: DOCUMENT_LINK, DATAROOM_LINK, WORKFLOW_LINK
 */
async function processLinkData(
  link: LinkRecord,
  options: {
    dataroomDocumentId?: string;
    isCustomDomain?: boolean;
  } = {},
): Promise<LinkFetchResult> {
  const { dataroomDocumentId, isCustomDomain } = options;
  const teamPlan = link.team?.plan || "free";
  const linkType = link.linkType;


  let brand: Partial<Brand> | Partial<DataroomBrand> | null = null;
  let linkData: any;

  // Handle DOCUMENT_LINK
  if (linkType === "DOCUMENT_LINK") {
    // Guard: teamId is required for document links
    if (!link.teamId) {
      return { status: "not_found" };
    }

    try {
      const data = await fetchDocumentLinkData({
        linkId: link.id,
        teamId: link.teamId,
      });
      linkData = data.linkData;
      brand = data.brand;
    } catch {
      return { status: "not_found" };
    }
  }

  const sanitizedAgreement =
    link.enableAgreement && link.agreement
      ? {
          id: link.agreement.id,
          name: link.agreement.name,
          content: link.agreement.content,
          contentType: link.agreement.contentType,
          signingProvider: link.agreement.signingProvider,
          requireName: link.agreement.requireName,
        }
      : null;

  // Sanitize document - keep fields needed by getStaticProps
  // Note: team/teamId are used server-side for feature flags and are stripped before client props
  const sanitizedDocument = linkData?.document
    ? {
        id: linkData.document.id,
        name: linkData.document.name,
        teamId: linkData.document.teamId,
        team: linkData.document.team, // Used server-side for plan check, stripped before client
        downloadOnly: linkData.document.downloadOnly,
        advancedExcelEnabled: linkData.document.advancedExcelEnabled,
        versions: linkData.document.versions,
      }
    : undefined;

  // Sanitize link for return - remove sensitive/internal data
  const sanitizedLink = {
    ...link,
    // Remove team object (contains plan, globalBlockList) but keep teamId for feature flags
    team: undefined,
    // Remove internal fields
    deletedAt: undefined,
    document: undefined,
    dataroom: undefined,
    password: link.password ? "protected" : null,
    // Use sanitized agreement
    agreement: sanitizedAgreement,
  };

  const returnLink = {
    ...sanitizedLink,
    ...linkData,
    // Override with sanitized document
    document: sanitizedDocument,
    // Keep dataroomId for DATAROOM_LINK types (needed for session verification and API calls)
    // For DOCUMENT_LINK types, set to undefined
    dataroomId:
      linkType === "DATAROOM_LINK"
        ? link.dataroomId || linkData?.dataroom?.id
        : undefined,
    dataroomDocument: linkData?.dataroom?.documents?.[0] || undefined,
  };

  let publicMeta: ResolvedPublicLinkMeta = {
    enableCustomMetatag: false,
    metaTitle: null,
    metaDescription: null,
    metaImage: null,
    metaFavicon: "/favicon.ico",
  };


  if (link.teamId && linkType === "DOCUMENT_LINK") {
    const teamBrandLp = await resolveBaseBrand({
      teamId: link.teamId,
      linkBrandId: link.brandId,
      select: teamBrandOgSelect,
    });
    const defaultTitle = linkData?.document?.name
      ? `${linkData.document.name} | Powered by Papermark`
      : "Shared link | Powered by Papermark";
    publicMeta = resolvePublicLinkMeta({
      link: {
        enableCustomMetatag: !!link.enableCustomMetatag,
        metaTitle: link.metaTitle,
        metaDescription: link.metaDescription,
        metaImage: link.metaImage,
        metaFavicon: link.metaFavicon,
      },
      teamBrand: teamBrandLp,
      defaultTitle,
    });
  }

  const [dataroomIndexEnabledForViewer, visibleBrand] = await Promise.all([
    Promise.resolve(undefined as boolean | undefined),
    applyPrivacyPolicyUrlVisibility(brand, {
      teamId: link.teamId,
      isCustomDomain,
    }),
  ]);

  // Serialize to convert Date objects to strings (required for Next.js getStaticProps)
  const serializedLink = JSON.parse(JSON.stringify(returnLink));
  const serializedBrand = visibleBrand
    ? JSON.parse(JSON.stringify(visibleBrand))
    : null;

  return {
    status: "ok",
    linkType,
    link: serializedLink,
    brand: serializedBrand,
    publicMeta: JSON.parse(JSON.stringify(publicMeta)),
    ...(dataroomIndexEnabledForViewer !== undefined && {
      dataroomIndexEnabledForViewer,
    }),
  };
}

/**
 * Fetch link data by linkId (for /view/[linkId] routes)
 */
export async function fetchLinkDataById({
  linkId,
  dataroomDocumentId,
}: {
  linkId: string;
  dataroomDocumentId?: string;
}): Promise<LinkFetchResult> {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    select: linkSelect,
  });

  if (!link) {
    return { status: "not_found" };
  }

  if (link.deletedAt) {
    return { status: "deleted" };
  }

  if (link.isArchived) {
    return { status: "archived" };
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { status: "expired" };
  }

  return processLinkData(link, { dataroomDocumentId, isCustomDomain: false });
}

/**
 * Fetch link data by domain and slug (for /view/domains/[domain]/[slug] routes)
 * Includes free plan check since custom domains require paid plan
 */
export async function fetchLinkDataByDomainSlug({
  domain,
  slug,
  dataroomDocumentId,
}: {
  domain: string;
  slug: string;
  dataroomDocumentId?: string;
}): Promise<LinkFetchResult> {
  const link = await prisma.link.findUnique({
    where: {
      domainSlug_slug: {
        slug: slug,
        domainSlug: domain,
      },
    },
    select: linkSelect,
  });

  if (!link) {
    return { status: "not_found" };
  }

  if (link.deletedAt) {
    return { status: "deleted" };
  }

  if (link.isArchived) {
    return { status: "archived" };
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { status: "expired" };
  }

  return processLinkData(link, { dataroomDocumentId, isCustomDomain: true });
}

// Legacy export aliases for backward compatibility
export const fetchCustomDomainLinkData = fetchLinkDataByDomainSlug;
export type CustomDomainLinkResult = LinkFetchResult;
