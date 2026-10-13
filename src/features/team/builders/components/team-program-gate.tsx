import { hasRoleAtLeast } from '@core/constants/roles';
import { useAuth } from '@/features/auth';
import { LoadingState } from '@/shared/components';
import { useTeamProgramMembership } from '../hooks/use-team-program-membership';
import { TeamProgramPage } from '../pages/team-program-page';
import type { TeamProgram } from '../team-programs';
import { TeamProgramLocked } from './team-program-locked';

/**
 * Decides what a team program page renders. Plans at or above the program's
 * minimum get the full page. Below it, a person flagged into the program gets
 * the member view — leaderboards and Daily Six, no tracker — and everyone else
 * the locked teaser. The menu lists both programs for every plan; the backend
 * scopes the data regardless.
 */
export function TeamProgramGate({ program }: { program: TeamProgram }) {
  const { user } = useAuth();
  const { membership, loading } = useTeamProgramMembership();
  const candidateRoles = [...(user?.roles || []), user?.accountType, user?.plan];
  const isMember = Boolean(membership?.[program.membershipFlag]);

  if (hasRoleAtLeast(candidateRoles, program.minimumPlan)) {
    return <TeamProgramPage program={program} isMember={isMember} />;
  }

  if (loading) {
    return (
      <div className="p-2">
        <LoadingState
          pageHeading={program.pluralLabel}
          pageDescription="Leaderboards and Daily Six"
          title={`Loading ${program.pluralLabel}`}
          description="Checking your access..."
        />
      </div>
    );
  }

  return isMember ? (
    <TeamProgramPage program={program} isMember memberOnly />
  ) : (
    <TeamProgramLocked program={program} />
  );
}
