import { TeamProgramPage } from '@/features/team/builders/pages/team-program-page';
import { PRODUCER_PROGRAM } from '@/features/team/builders/team-programs';

/**
 * My Team → Producers (SMD only): the Builders page over associates flagged
 * Producer — same tracker, leaderboards and Daily Six.
 */
export default function ProducersPage() {
  return <TeamProgramPage program={PRODUCER_PROGRAM} />;
}
