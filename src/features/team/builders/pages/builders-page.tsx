import { TeamProgramGate } from '../components/team-program-gate';
import { BUILDER_PROGRAM } from '../team-programs';

/**
 * My Team → Builders: the team program over associates flagged Builder.
 * Leader and above; lower plans see the locked teaser.
 */
export default function BuildersPage() {
  return <TeamProgramGate program={BUILDER_PROGRAM} />;
}
