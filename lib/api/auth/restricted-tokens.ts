import { z } from "zod";

import prisma from "@/lib/prisma";

// "user" keys act as the person who created them and are revoked when that
// person leaves the team; "machine" keys belong to the team itself.
export const RestrictedTokenSubjectTypeSchema = z.enum(["user", "machine"]);
export type RestrictedTokenSubjectType = z.infer<
  typeof RestrictedTokenSubjectTypeSchema
>;

export function parseRestrictedTokenSubjectType(
  value: string | null | undefined,
): RestrictedTokenSubjectType {
  return value === "machine" ? "machine" : "user";
}

export async function revokeUserBoundTeamTokens(
  userId: string,
  teamId: string,
): Promise<number> {
  const result = await prisma.restrictedToken.deleteMany({
    where: { userId, teamId, subjectType: "user" },
  });
  return result.count;
}
