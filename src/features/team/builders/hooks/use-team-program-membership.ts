import { useEffect, useState } from 'react';
import { fetchTeamProgramMembership, type TeamProgramMembership } from '../services/builders-service';

interface TeamProgramMembershipState {
  membership: TeamProgramMembership | null;
  loading: boolean;
}

/**
 * Whether the viewer is flagged Builder and/or Producer. A failed request
 * reads as "in neither program": the page then falls back to what the viewer's
 * plan alone allows, which is the behaviour before membership existed.
 */
export function useTeamProgramMembership(): TeamProgramMembershipState {
  const [state, setState] = useState<TeamProgramMembershipState>({ membership: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();

    fetchTeamProgramMembership(controller.signal)
      .then((membership) => setState({ membership, loading: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ membership: null, loading: false });
      });

    return () => controller.abort();
  }, []);

  return state;
}
