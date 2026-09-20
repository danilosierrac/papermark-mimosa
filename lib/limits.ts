import prisma from "@/lib/prisma";

// Self-hosted fork: no plan tiers, no caps. `getLimits` still reports usage
// so the UI can show it, but every limit is "unlimited" (undefined).

export type FileSizeLimits = {
  video?: number; // MB
  document?: number; // MB
  image?: number; // MB
  excel?: number; // MB
  maxFiles?: number;
  maxPages?: number;
};

export type TeamLimits = {
  datarooms?: number;
  links?: number;
  documents?: number;
  users?: number;
  domains?: number;
  customDomainOnPro?: boolean;
  customDomainInDataroom?: boolean;
  advancedLinkControlsOnPro?: boolean | null;
  watermarkOnBusiness?: boolean | null;
  agreementOnBusiness?: boolean | null;
  conversationsInDataroom?: boolean | null;
  linkCustomFields?: number | null;
  fileSizeLimits?: FileSizeLimits;
  usage: {
    documents: number;
    links: number;
    users: number;
  };
  dataroomUpload: boolean;
};

export async function getLimits({
  teamId,
  userId,
}: {
  teamId: string;
  userId: string;
}): Promise<TeamLimits> {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
      users: { some: { userId } },
    },
    select: {
      _count: {
        select: {
          documents: true,
          links: true,
          users: true,
        },
      },
    },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  return {
    customDomainOnPro: true,
    advancedLinkControlsOnPro: true,
    watermarkOnBusiness: true,
    agreementOnBusiness: true,
    usage: {
      documents: team._count.documents,
      links: team._count.links,
      users: team._count.users,
    },
    dataroomUpload: false,
  };
}
