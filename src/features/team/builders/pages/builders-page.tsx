import { BUILDER_PROGRAM } from '../team-programs';
import { TeamProgramPage } from './team-program-page';

/** My Team → Builders: the team program over associates flagged Builder. */
export default function BuildersPage() {
  return <TeamProgramPage program={BUILDER_PROGRAM} />;
}
