/**
 * Leaderboard settings, for holders of `wbreporting:manage`.
 *
 * Sections save independently, because they are independent decisions: someone
 * correcting a goal should not have to re-confirm the privacy matrix.
 *
 * Two things are deliberately **not** here:
 *
 * - **Settings managers.** The delivered package specifies an allow-list table for
 *   them; this application has an access console, so the people who may edit these
 *   settings are the ones granted `wbreporting:manage` there. A second list would be
 *   a second answer to the same question.
 * - **Recalculation controls.** They already exist, with run history and a heartbeat,
 *   on the Reporting Pipeline screen. This page links to it rather than growing a
 *   second set of buttons against the same jobs.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button';
import {
  useDateRanges,
  useDisplaySettings,
  useLeaderboardGoals,
  useSaveDateRange,
  useSaveDisplaySettings,
  useSaveLeaderboardGoals,
} from '../hooks/use-leaderboards';
import type {
  DetailVisibility,
  LeaderboardDisplaySettings,
  LeaderboardGoals,
  VisibilityRelationship,
} from '../types';
import '../leaderboards.css';

const GOAL_FIELDS: Array<{ key: keyof LeaderboardGoals; label: string }> = [
  { key: 'recruits_goal', label: 'Business Partners' },
  { key: 'points_goal', label: 'Points' },
  { key: 'licenses_goal', label: 'Licenses' },
  { key: 'convention_goal', label: 'Convention' },
];

/** The matrix rows, ordered from least to most privileged viewer. */
const RELATIONSHIPS: Array<{ key: VisibilityRelationship; label: string; help: string }> = [
  { key: 'public', label: 'Anyone else', help: 'A signed-in user with no relationship to the agent.' },
  { key: 'self', label: 'The agent themselves', help: 'Their own figures.' },
  { key: 'direct_downline', label: 'Their recruiter', help: 'The person who recruited them.' },
  { key: 'downline', label: 'Anyone above them', help: 'Further up the recruiting tree.' },
  { key: 'leader', label: 'Their assigned leader', help: 'The leader they report to.' },
  { key: 'smd', label: 'An SMD above them', help: 'Any SMD in their upline.' },
  { key: 'broker', label: 'Broker / executive', help: 'Holders of the configured boundary role.' },
];

const VISIBILITY_OPTIONS: Array<{ value: DetailVisibility; label: string; help: string }> = [
  { value: 'hidden', label: 'Hidden', help: 'The field is left out of the response entirely.' },
  { value: 'masked', label: 'Masked', help: 'Je***l and 6***327 — enough to recognise, not to identify.' },
  { value: 'full', label: 'Full', help: 'The raw client name and policy number.' },
];

export function LeaderboardSettings() {
  const goals = useLeaderboardGoals();
  const display = useDisplaySettings();
  const ranges = useDateRanges();
  const saveGoals = useSaveLeaderboardGoals();
  const saveDisplay = useSaveDisplaySettings();
  const saveRange = useSaveDateRange();

  const [goalDraft, setGoalDraft] = useState<Partial<LeaderboardGoals>>({});
  const [displayDraft, setDisplayDraft] = useState<Partial<LeaderboardDisplaySettings>>({});

  // Seed each draft once its section has loaded. Without this the inputs would be
  // controlled-but-empty until the first keystroke.
  useEffect(() => {
    if (goals.data) setGoalDraft(goals.data);
  }, [goals.data]);
  useEffect(() => {
    if (display.data) setDisplayDraft(display.data);
  }, [display.data]);

  return (
    <div className="wb-lb-settings">
      <header>
        <h2 className="wb-lb-settings__title">Leaderboard settings</h2>
        <p className="wb-lb-settings__intro">
          Who may edit this page is managed in the access console, under{' '}
          <code>wbreporting:manage</code>. Rebuilds and run history live on the{' '}
          <Link to="/admin/reporting-pipeline">Reporting Pipeline</Link> screen.
        </p>
      </header>

      <section className="wb-lb-settings__section" aria-label="Goals">
        <h3>Goals</h3>
        <p className="wb-lb-settings__help">
          The denominators behind the Full Report's gauges.
        </p>
        <div className="wb-lb-settings__grid">
          {GOAL_FIELDS.map((field) => (
            <label key={field.key} className="wb-lb-settings__field">
              <span>{field.label}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={String(goalDraft[field.key] ?? '')}
                onChange={(event) =>
                  setGoalDraft((draft) => ({ ...draft, [field.key]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => saveGoals.mutate(goalDraft)}
          disabled={saveGoals.isPending || goals.isLoading}
        >
          {saveGoals.isPending ? 'Saving…' : 'Save goals'}
        </Button>
        {saveGoals.isError && (
          <p className="wb-lb-settings__error" role="alert">
            {(saveGoals.error as Error).message}
          </p>
        )}
      </section>

      <section className="wb-lb-settings__section" aria-label="Scopes and milestones">
        <h3>Scopes and milestones</h3>
        <label className="wb-lb-settings__checkbox">
          <input
            type="checkbox"
            checked={Boolean(displayDraft.show_net_base)}
            onChange={(event) =>
              setDisplayDraft((draft) => ({ ...draft, show_net_base: event.target.checked }))
            }
          />
          <span>
            Offer the Net Base scope
            <small>
              Net Base stops at both MD and SMD branches. It is off until the business
              has agreed what it means here; the backend refuses the scope while it is
              off, not just the control.
            </small>
          </span>
        </label>

        <label className="wb-lb-settings__field">
          <span>Milestone measurement</span>
          <select
            value={displayDraft.milestone_measurement_mode ?? 'milestones_completed'}
            onChange={(event) =>
              setDisplayDraft((draft) => ({
                ...draft,
                milestone_measurement_mode: event.target
                  .value as LeaderboardDisplaySettings['milestone_measurement_mode'],
              }))
            }
          >
            <option value="new_recruit_cohort">
              New recruit cohort — only people recruited in the period
            </option>
            <option value="milestones_completed">
              Milestones completed — also people who completed in the period
            </option>
          </select>
        </label>
        <p className="wb-lb-settings__help">
          Chosen here and nowhere else: if readers could switch it per view, two people
          comparing screens would be comparing different populations.
        </p>
      </section>

      <section className="wb-lb-settings__section" aria-label="Detail privacy">
        <h3>Detail privacy</h3>
        <p className="wb-lb-settings__help">
          How much of an agent's client and policy detail each kind of viewer sees. The
          server applies this before responding — a hidden field never reaches the
          browser.
        </p>
        <table className="wb-lb-settings__matrix">
          <thead>
            <tr>
              <th scope="col">Viewer</th>
              {VISIBILITY_OPTIONS.map((option) => (
                <th key={option.value} scope="col" title={option.help}>
                  {option.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RELATIONSHIPS.map((relationship) => {
              const field = `${relationship.key}_detail` as keyof LeaderboardDisplaySettings;
              return (
                <tr key={relationship.key}>
                  <th scope="row" title={relationship.help}>
                    {relationship.label}
                  </th>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <td key={option.value}>
                      <input
                        type="radio"
                        name={field}
                        value={option.value}
                        checked={displayDraft[field] === option.value}
                        onChange={() =>
                          setDisplayDraft((draft) => ({ ...draft, [field]: option.value }))
                        }
                        aria-label={`${relationship.label}: ${option.label}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        <Button
          type="button"
          onClick={() => saveDisplay.mutate(displayDraft)}
          disabled={saveDisplay.isPending || display.isLoading}
        >
          {saveDisplay.isPending ? 'Saving…' : 'Save scopes and privacy'}
        </Button>
        {saveDisplay.isError && (
          <p className="wb-lb-settings__error" role="alert">
            {(saveDisplay.error as Error).message}
          </p>
        )}
      </section>

      <section className="wb-lb-settings__section" aria-label="Date ranges">
        <h3>Date ranges</h3>
        <p className="wb-lb-settings__help">
          Which named ranges the leaderboard offers. Hiding them all leaves only the
          custom start/end pickers.
        </p>
        <ul className="wb-lb-settings__ranges">
          {(ranges.data ?? []).map((range) => (
            <li key={range.range_key}>
              <label className="wb-lb-settings__checkbox">
                <input
                  type="checkbox"
                  checked={range.is_visible}
                  onChange={(event) =>
                    saveRange.mutate({
                      rangeKey: range.range_key,
                      patch: { is_visible: event.target.checked },
                    })
                  }
                />
                <span>{range.label}</span>
              </label>
            </li>
          ))}
          {ranges.data?.length === 0 && (
            <li className="wb-lb-settings__help">
              No ranges configured yet — run <code>seed_wbreporting_date_ranges</code>.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

export default LeaderboardSettings;
