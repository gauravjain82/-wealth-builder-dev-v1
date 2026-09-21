/** Policy misalignments report — client-side filtering + policy detail modal. */

import { useMemo, useState } from 'react';

import { Button, Checkbox, Heading, Input, Text, LoadingState, ErrorState, NonIdealState } from '@/shared/components';

import { PolicyDetailModal } from '../components/policy-detail-modal';
import { PolicyMisalignmentsList } from '../components/policy-misalignments-list';
import { usePolicyMisalignments } from '../hooks/use-misalignments';

export default function PolicyMisalignmentsPage() {
  const { data, isLoading, isError, refetch } = usePolicyMisalignments();

  const [term, setTerm] = useState('');
  const [missing, setMissing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [missingEntered, setMissingEntered] = useState(false);
  const [openPolicyId, setOpenPolicyId] = useState<number | null>(null);

  const rows = data?.rows ?? [];

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return rows.filter((row) => {
      const text = JSON.stringify(row).toLowerCase();
      const hasMissing = row.missing_agents > 0;
      const hasInvalid = row.agents.some((agent) => !agent.valid);
      if (needle && !text.includes(needle)) return false;
      if (missing && !hasMissing) return false;
      if (invalid && !hasInvalid) return false;
      if (missingEntered && row.created_by_id) return false;
      return true;
    });
  }, [rows, term, missing, invalid, missingEntered]);

  // Agency-code suggestions from valid agents on loaded rows (mirrors #agentOptions).
  const agentOptions = useMemo(() => {
    const options = new Map<string, string>();
    rows.forEach((row) =>
      row.agents
        .filter((agent) => agent.valid && agent.agency_code)
        .forEach((agent) => options.set(agent.agency_code as string, `${agent.name} [${agent.agency_code}]`))
    );
    return [...options.entries()];
  }, [rows]);

  const clear = () => {
    setTerm('');
    setMissing(false);
    setInvalid(false);
    setMissingEntered(false);
  };

  if (isLoading) {
    return (
      <LoadingState
        pageHeading="Policy Misalignments"
        pageDescription="Policies with missing or invalid agent-split assignments."
      />
    );
  }
  if (isError) {
    return (
      <ErrorState
        pageHeading="Policy Misalignments"
        description="Unable to load policy misalignments."
        onRetry={() => refetch()}
      />
    );
  }

  const missingCount = visible.filter((row) => row.missing_agents > 0).length;
  const invalidCount = visible.filter((row) => row.agents.some((agent) => !agent.valid)).length;
  const enteredCount = visible.filter((row) => !row.created_by_id).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h1" variant="h4" weight="bold">
            Policy Misalignments
          </Heading>
          <Text variant="muted">Policies with missing or invalid agent-split assignments.</Text>
        </div>
        <Text variant="muted" className="text-sm">
          {visible.length.toLocaleString()} showing · {rows.length.toLocaleString()} total
        </Text>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          list="misalignments-agent-options"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Filter policy, client, agent, or issue"
          className="min-w-[18rem] flex-1"
        />
        <datalist id="misalignments-agent-options">
          {agentOptions.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </datalist>
        <Button variant="outline" onClick={clear}>
          Clear
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={missing} onChange={(e) => setMissing(e.target.checked)} />
          Missing agent
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={invalid} onChange={(e) => setInvalid(e.target.checked)} />
          Invalid agent
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={missingEntered} onChange={(e) => setMissingEntered(e.target.checked)} />
          Missing entered by
        </label>
      </div>

      <Text variant="muted" className="text-sm">
        Missing agent: {missingCount.toLocaleString()} · Invalid agent: {invalidCount.toLocaleString()} ·
        Missing entered by: {enteredCount.toLocaleString()}
      </Text>

      {visible.length ? (
        <PolicyMisalignmentsList
          rows={visible}
          onOpenPolicy={setOpenPolicyId}
          onFilterAgent={setTerm}
        />
      ) : (
        <NonIdealState title="No matching policy misalignments." />
      )}

      <PolicyDetailModal policyId={openPolicyId} onClose={() => setOpenPolicyId(null)} />
    </div>
  );
}
