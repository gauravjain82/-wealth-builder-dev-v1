/**
 * The filter controls: person, view, Net, Leaders, Agents.
 *
 * Everything here is a **draft**. `UI_CONTRACT.md` is explicit that filter drafts do
 * not alter results until Apply, so this component owns local state and only calls
 * `onApply` when the button is pressed. A person picked from the autocomplete changes
 * the draft, not the standings.
 *
 * `Net` is deliberately labelled "Direct reports only" rather than "Net" or "Net
 * Base". The contest `net` filter keeps the selected person plus whoever reports
 * directly to them; Package 2's Net Base is a different rule entirely, and reusing
 * its name here would be read as that rule.
 */

import { useEffect, useState } from 'react';

import { UserAutocompleteDropdown } from '@/shared/components/user-autocomplete-dropdown';

import type { ContestScope, FilterDraft } from '../types';

interface ContestFiltersProps {
  applied: FilterDraft;
  onApply: (draft: FilterDraft) => void;
  onClose: () => void;
}

const SCOPE_OPTIONS: Array<{ value: ContestScope; label: string }> = [
  { value: 'personal', label: 'Just this person' },
  { value: 'base', label: 'Base shop' },
  { value: 'super_base', label: 'Super base' },
  { value: 'super_team', label: 'Super team' },
  { value: 'all', label: 'Everyone I can see' },
];

export function ContestFilters({ applied, onApply, onClose }: ContestFiltersProps) {
  const [draft, setDraft] = useState<FilterDraft>(applied);

  // Re-seed the draft when the applied filters change underneath us — for example
  // after an upline shortcut applies a newly selected person.
  useEffect(() => setDraft(applied), [applied]);

  const update = <K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="wb-ct-dialog"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <label>
        <span className="wb-ct-tier-period">Person</span>
        <UserAutocompleteDropdown
          selectedId={draft.personId}
          selectedLabel={draft.personLabel}
          placeholder="Search by name or agent code"
          fetchFromApi
          onSelect={(option) =>
            setDraft((current) => ({
              ...current,
              personId: option.id,
              personLabel: option.label,
            }))
          }
        />
      </label>

      <label>
        <span className="wb-ct-tier-period">View</span>
        <select
          value={draft.scope}
          onChange={(event) => update('scope', event.target.value as ContestScope)}
        >
          {SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={draft.net}
          onChange={(event) => update('net', event.target.checked)}
        />{' '}
        Direct reports only
      </label>

      <label>
        <input
          type="checkbox"
          checked={draft.leaders}
          onChange={(event) => update('leaders', event.target.checked)}
        />{' '}
        Include leaders
      </label>

      <label>
        <input
          type="checkbox"
          checked={draft.agents}
          onChange={(event) => update('agents', event.target.checked)}
        />{' '}
        Include agents
      </label>

      {!draft.leaders && !draft.agents ? (
        <p className="wb-ct-note">
          With both unchecked nobody matches, so the standings will be empty.
        </p>
      ) : null}

      <div className="wb-ct-header-actions">
        <button type="submit" className="wb-ct-more">
          Apply
        </button>
        <button type="button" className="wb-ct-more" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
