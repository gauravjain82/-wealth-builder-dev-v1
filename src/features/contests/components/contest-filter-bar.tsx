/**
 * The standalone page's filter bar, always visible, as on dtez: Person, View, the net
 * filter, Leaders, Agents, Apply, Upline, Leader, and the summary line under them.
 *
 * Like the Home v2 modal (`contest-filters.tsx`) it is a **draft** until Apply, or
 * Enter in the person search: nothing typed or ticked reaches the server before then
 * (`docs/contests/UI.md` §4).
 *
 * Three rules differ from dtez on purpose (`docs/contests/UI.md` §2.3):
 *
 * - **An empty search selects nobody.** dtez's `findPerson('')` matches the first
 *   person in its list, because every label includes the empty string, so Apply with
 *   Personal and an empty box shows a stranger. Here an empty box means no person.
 * - **A person-based view with no person is an error**, shown under the bar, and the
 *   search is focused. The backend would otherwise root the view at the viewer
 *   (`views_contests.py`, `person or request.user.id`) and the page would show the
 *   viewer's own base under a summary that says nobody is selected.
 * - **The net checkbox is labelled "Direct reports only"**, not dtez's "Net" (C10;
 *   the question is open in `docs/contests/PHASES.md` §3).
 */

import { useEffect, useId, useRef, useState } from 'react';

import {
  personLabel,
  useAgentProfile,
  useFindPeople,
  usePersonSearch,
} from '../hooks/use-contests';
import type { ContestScope, FilterDraft, PersonOption, ProfilePathNode } from '../types';
import { SCOPE_OPTIONS, scopeLabel } from './scope-options';

interface ContestFilterBarProps {
  applied: FilterDraft;
  /**
   * A readable contest to read the applied person's profile through, for Upline and
   * Leader. The profile does not depend on the contest (the view only checks that it
   * is readable), so the page passes the first one: a contest switch then does not
   * refetch it.
   */
  profileContestId: number | null;
  /** `leader_count` from the standings; absent from an older backend. */
  leaderCount: number | undefined;
  onApply: (filters: FilterDraft) => void;
}

/** Typing settles for this long before the suggestions are searched. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The match for what was typed: an exact label, code or name first, then the search's
 * first result. Never called with empty text — that is the dtez bug this avoids.
 */
function pickPerson(matches: PersonOption[], text: string): PersonOption | null {
  const wanted = text.toLowerCase();
  return (
    matches.find((person) => person.label.toLowerCase() === wanted) ??
    matches.find((person) => person.agencyCode.toLowerCase() === wanted) ??
    matches.find((person) => person.name.toLowerCase() === wanted) ??
    matches[0] ??
    null
  );
}

function nodeLabel(node: ProfilePathNode): string {
  return personLabel(node.name, node.agency_code);
}

function rolesLabel(filters: FilterDraft): string {
  if (filters.leaders && filters.agents) return 'Leaders + Agents';
  if (filters.leaders) return 'Leaders';
  if (filters.agents) return 'Agents';
  return 'None';
}

export function ContestFilterBar({
  applied,
  profileContestId,
  leaderCount,
  onApply,
}: ContestFilterBarProps) {
  const [draft, setDraft] = useState<FilterDraft>(applied);
  const [text, setText] = useState(applied.personLabel);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const errorId = useId();

  // Re-seed when the applied filters change underneath — after Upline or Leader.
  useEffect(() => {
    setDraft(applied);
    setText(applied.personLabel);
  }, [applied]);

  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const trimmed = text.trim();
    // A label picked from the list is already a person; searching it would find nobody.
    const next = trimmed === draft.personLabel ? '' : trimmed;
    const timer = setTimeout(() => setSearchTerm(next), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, draft.personLabel]);
  const { data: suggestions = [] } = usePersonSearch(searchTerm);
  const findPeople = useFindPeople();

  // Upline and Leader read the applied person's profile. Until it arrives both stay
  // disabled; the profile endpoint loads the viewer's whole hierarchy, so that can take
  // seconds (recorded for parity phase 20).
  const { data: profile } = useAgentProfile(
    applied.personId !== null && profileContestId !== null
      ? { contestId: profileContestId, agentId: applied.personId }
      : null
  );
  const upline = applied.personId !== null ? (profile?.recruiter ?? null) : null;
  const leader =
    applied.personId !== null && profile?.leader?.agent_id !== applied.personId
      ? (profile?.leader ?? null)
      : null;

  const fail = (message: string) => {
    setError(message);
    searchRef.current?.focus();
  };

  const apply = async (next: FilterDraft, typed: string) => {
    let { personId, personLabel: label } = next;
    const wanted = typed.trim();
    if (!wanted) {
      personId = null;
      label = '';
    } else if (personId === null || wanted !== label) {
      setResolving(true);
      try {
        const match = pickPerson(await findPeople(wanted), wanted);
        if (!match) return fail(`No one matches “${wanted}”.`);
        personId = match.id;
        label = match.label;
      } catch (caught) {
        return fail((caught as Error)?.message ?? 'The person search failed.');
      } finally {
        setResolving(false);
      }
    }

    if (next.scope !== 'all' && personId === null) {
      return fail('Select a person before applying this view.');
    }
    setError(null);
    onApply({ ...next, personId, personLabel: label });
  };

  /** Upline and Leader move the person and re-apply the rest of the draft, as dtez does. */
  const moveTo = (node: ProfilePathNode) => {
    const label = nodeLabel(node);
    setText(label);
    void apply({ ...draft, personId: node.agent_id, personLabel: label }, label);
  };

  const update = <K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="wb-ct-filterbar"
      aria-label="Filters"
      onSubmit={(event) => {
        event.preventDefault();
        void apply(draft, text);
      }}
    >
      <div className="wb-ct-filter-grid">
        <label className="wb-ct-filter-person">
          Person
          <input
            ref={searchRef}
            type="search"
            value={text}
            list={listId}
            placeholder="Search by agent name or code"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              const value = event.target.value;
              setText(value);
              // Picking from the list fills the box with a label; take that person now.
              const picked = suggestions.find((person) => person.label === value);
              if (picked) {
                setDraft((current) => ({
                  ...current,
                  personId: picked.id,
                  personLabel: picked.label,
                }));
              }
            }}
          />
          <datalist id={listId}>
            {suggestions.map((person) => (
              <option key={person.id} value={person.label} />
            ))}
          </datalist>
        </label>

        <label className="wb-ct-filter-view">
          View
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

        <label className="wb-ct-filter-check">
          <input
            type="checkbox"
            checked={draft.net}
            onChange={(event) => update('net', event.target.checked)}
          />
          Direct reports only
        </label>
        <label className="wb-ct-filter-check">
          <input
            type="checkbox"
            checked={draft.leaders}
            onChange={(event) => update('leaders', event.target.checked)}
          />
          Leaders
        </label>
        <label className="wb-ct-filter-check">
          <input
            type="checkbox"
            checked={draft.agents}
            onChange={(event) => update('agents', event.target.checked)}
          />
          Agents
        </label>

        <div className="wb-ct-filter-actions">
          <button type="submit" className="wb-ct-button" disabled={resolving}>
            Apply
          </button>
          <button
            type="button"
            className="wb-ct-button"
            disabled={!upline || resolving}
            title={upline ? `Select ${nodeLabel(upline)}` : 'Select a person with a recruiter first'}
            onClick={() => upline && moveTo(upline)}
          >
            Upline
          </button>
          <button
            type="button"
            className="wb-ct-button"
            disabled={!leader || resolving}
            title={leader ? `Select ${nodeLabel(leader)}` : 'Select a person with a leader first'}
            onClick={() => leader && moveTo(leader)}
          >
            Leader
          </button>
        </div>
      </div>

      {error ? (
        <p id={errorId} className="wb-ct-filter-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="wb-ct-filter-summary">
        <span>
          Selected: <strong>{applied.personId !== null ? applied.personLabel : 'All agents'}</strong>
        </span>
        <span>
          View:{' '}
          <strong>
            {scopeLabel(applied.scope)}
            {applied.net ? ' · Direct reports only' : ''}
          </strong>
        </span>
        <span>
          Roles: <strong>{rolesLabel(applied)}</strong>
        </span>
        <span>{leaderCount !== undefined ? leaderCount.toLocaleString() : '—'} leaders identified</span>
      </p>
    </form>
  );
}
