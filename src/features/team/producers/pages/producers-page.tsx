import { TeamProgramGate } from '@/features/team/builders/components/team-program-gate';
import { PRODUCER_PROGRAM } from '@/features/team/builders/team-programs';

/**
 * My Team → Producers: the Builders page over associates flagged Producer —
 * same tracker, leaderboards and Daily Six. Leader and above, same as Builders;
 * below that a flagged Producer gets the member view and everyone else the
 * locked teaser.
 */
export default function ProducersPage() {
  return <TeamProgramGate program={PRODUCER_PROGRAM} />;
}
