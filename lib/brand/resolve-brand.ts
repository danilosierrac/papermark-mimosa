import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

// Fields the public viewer needs from a Brand row.
export const teamBrandViewerSelect = {
  id: true,
  logo: true,
  hideLogo: true,
  banner: true,
  brandColor: true,
  accentColor: true,
  accentButtonColor: true,
  applyAccentColorToDataroomView: true,
  welcomeMessage: true,
  ctaLabel: true,
  ctaUrl: true,
  privacyPolicyUrl: true,
  cardLayout: true,
  showFolderTree: true,
  viewerLayoutPreset: true,
  viewerHeaderStyle: true,
  hideFolderIconsInMain: true,
  defaultLanguage: true,
} satisfies Prisma.BrandSelect;

// Fields needed to build Open Graph / social preview tags for a link.
export const teamBrandOgSelect = {
  customLinkPreviewEnabled: true,
  linkPreviewTitle: true,
  linkPreviewDescription: true,
  linkPreviewImage: true,
  linkPreviewFavicon: true,
} satisfies Prisma.BrandSelect;

/**
 * The brand a link should display: the link's own brand when it belongs to
 * the team, otherwise the team default, otherwise the team's oldest brand.
 */
export async function resolveBaseBrand<S extends Prisma.BrandSelect>({
  teamId,
  linkBrandId,
  select,
}: {
  teamId: string;
  linkBrandId?: string | null;
  select: S;
}): Promise<Prisma.BrandGetPayload<{ select: S }> | null> {
  if (linkBrandId) {
    const linkBrand = await prisma.brand.findFirst({
      where: { id: linkBrandId, teamId },
      select,
    });
    if (linkBrand) return linkBrand;
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { defaultBrand: { select } },
  });
  if (team?.defaultBrand) return team.defaultBrand;

  return prisma.brand.findFirst({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    select,
  });
}

/** Returns `brandId` if that brand belongs to the team, otherwise null. */
export async function resolveOwnedBrandId(
  teamId: string,
  brandId?: string | null,
): Promise<string | null> {
  if (!brandId) return null;
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, teamId },
    select: { id: true },
  });
  return brand?.id ?? null;
}

/** The team's default brand id, or its oldest brand, or null. */
export async function resolveDefaultBrandId(
  teamId: string,
): Promise<string | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { defaultBrandId: true },
  });
  if (team?.defaultBrandId) return team.defaultBrandId;
  const brand = await prisma.brand.findFirst({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return brand?.id ?? null;
}

export type ResolvedPublicLinkMeta = {
  enableCustomMetatag: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaImage: string | null;
  metaFavicon: string | null;
};

type LinkMetaFields = {
  enableCustomMetatag: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaImage?: string | null;
  metaFavicon?: string | null;
};

type BrandMetaFields = Prisma.BrandGetPayload<{
  select: typeof teamBrandOgSelect;
}> | null;

/**
 * Social preview for a public link: the link's own settings win, then the
 * brand's link preview if enabled, then plain defaults.
 */
export function resolvePublicLinkMeta({
  link,
  teamBrand,
  defaultTitle,
}: {
  link: LinkMetaFields;
  teamBrand: BrandMetaFields;
  defaultTitle: string;
}): ResolvedPublicLinkMeta {
  if (link.enableCustomMetatag) {
    return {
      enableCustomMetatag: true,
      metaTitle: link.metaTitle ?? defaultTitle,
      metaDescription: link.metaDescription ?? null,
      metaImage: link.metaImage ?? null,
      metaFavicon: link.metaFavicon ?? "/favicon.ico",
    };
  }

  if (teamBrand?.customLinkPreviewEnabled) {
    return {
      enableCustomMetatag: true,
      metaTitle: teamBrand.linkPreviewTitle ?? defaultTitle,
      metaDescription: teamBrand.linkPreviewDescription ?? null,
      metaImage: teamBrand.linkPreviewImage ?? null,
      metaFavicon: teamBrand.linkPreviewFavicon ?? "/favicon.ico",
    };
  }

  return {
    enableCustomMetatag: false,
    metaTitle: null,
    metaDescription: null,
    metaImage: null,
    metaFavicon: "/favicon.ico",
  };
}
