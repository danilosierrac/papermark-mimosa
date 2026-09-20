import { useTeam } from "@/context/team-context";
import useSWR from "swr";

import type { TeamLimits } from "@/lib/limits";
import { fetcher } from "@/lib/utils";

export type LimitProps = TeamLimits;

export function useLimits() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error } = useSWR<LimitProps | null>(
    teamId && `/api/teams/${teamId}/limits`,
    fetcher,
    { dedupingInterval: 30000 },
  );

  // Self-hosted fork: nothing is capped.
  return {
    showUpgradePlanModal: false,
    limits: data,
    canAddDocuments: true,
    canAddLinks: true,
    canAddUsers: true,
    isPaused: false,
    error,
    loading: !data && !error,
  };
}

export default useLimits;
