import { hasRoleAtLeast } from '@core/constants/roles';
import { useAuth } from '@/features/auth';
import { TeamProgramPage } from '../pages/team-program-page';
import type { TeamProgram } from '../team-programs';
import { TeamProgramLocked } from './team-program-locked';

/**
 * Opens a team program for plans at or above its minimum and shows the locked
 * teaser to everyone else. The menu lists both programs for every plan, so
 * this decides what the page renders; the backend scopes the data regardless.
 */
export function TeamProgramGate({ program }: { program: TeamProgram }) {
  const { user } = useAuth();
  const candidateRoles = [...(user?.roles || []), user?.accountType, user?.plan];

  return hasRoleAtLeast(candidateRoles, program.minimumPlan) ? (
    <TeamProgramPage program={program} />
  ) : (
    <TeamProgramLocked program={program} />
  );
}
