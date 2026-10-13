import { TeamProgramGate } from '../components/team-program-gate';
import { BUILDER_PROGRAM } from '../team-programs';

/**
 * My Team → Builders: the team program over associates flagged Builder.
 * Leader and above; below that a flagged Builder gets the member view and
 * everyone else the locked teaser.
 */
export default function BuildersPage() {
  return <TeamProgramGate program={BUILDER_PROGRAM} />;
}
