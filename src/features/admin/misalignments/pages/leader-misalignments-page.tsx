/** Leader (hierarchy) misalignments report — client-side filtering over loaded rows. */

import { useMemo, useState } from 'react';

import { Button, Checkbox, Heading, Input, Text, LoadingState, ErrorState, NonIdealState } from '@/shared/components';

import { LeaderMisalignmentsTable } from '../components/leader-misalignments-table';
import { useLeaderMisalignments } from '../hooks/use-misalignments';

export default function LeaderMisalignmentsPage() {
  const { data, isLoading, isError, refetch } = useLeaderMisalignments();

  const [term, setTerm] = useState('');
  const [noRecruiter, setNoRecruiter] = useState(false);
  const [noLeader, setNoLeader] = useState(false);
  const [badReference, setBadReference] = useState(false);

  const rows = data?.rows ?? [];

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !JSON.stringify(row).toLowerCase().includes(needle)) return false;
      if (noRecruiter && row.recruited_by_id) return false;
      if (noLeader && row.leader_id) return false;
      if (badReference && !row.bad_reference_fields.length) return false;
      return true;
    });
  }, [rows, term, noRecruiter, noLeader, badReference]);

  const clear = () => {
    setTerm('');
    setNoRecruiter(false);
    setNoLeader(false);
    setBadReference(false);
  };

  if (isLoading) {
    return (
      <LoadingState
        pageHeading="Leader Misalignments"
        pageDescription="Active agents with missing, invalid, self-referencing, or misaligned hierarchy assignments."
      />
    );
  }
  if (isError) {
    return (
      <ErrorState
        pageHeading="Leader Misalignments"
        description="Unable to load leader misalignments."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h1" variant="h4" weight="bold">
            Leader Misalignments
          </Heading>
          <Text variant="muted">
            Active agents with missing, invalid, self-referencing, or misaligned hierarchy
            assignments.
          </Text>
        </div>
        <Text variant="muted" className="text-sm">
          {visible.length.toLocaleString()} showing · {rows.length.toLocaleString()} total
        </Text>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Filter name, agency code, leader, issue, or trail"
          className="min-w-[18rem] flex-1"
        />
        <Button variant="outline" onClick={clear}>
          Clear
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={noRecruiter} onChange={(e) => setNoRecruiter(e.target.checked)} />
          No Recruiter
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={noLeader} onChange={(e) => setNoLeader(e.target.checked)} />
          No Leader
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={badReference} onChange={(e) => setBadReference(e.target.checked)} />
          Bad Reference
        </label>
      </div>

      {visible.length ? (
        <LeaderMisalignmentsTable rows={visible} onFilterAgent={setTerm} />
      ) : (
        <NonIdealState title="No matching misalignments." />
      )}
    </div>
  );
}
