/**
 * Contest settings — the manager's surface over the Package 3 settings endpoints.
 *
 * Gated on `wbreporting:manage`. The backend enforces that independently on every
 * endpoint; this screen only decides what to render.
 *
 * Two things here are not cosmetic:
 *
 * **Optimistic concurrency is visible.** Every contest and every tier carries a
 * `revision`, and a save sends all of them back. If somebody else saved first the
 * server answers 409 `edit_conflict`, and this screen says so and offers Reload
 * rather than retrying — retrying would be exactly the silent overwrite decision C8
 * exists to prevent. A tier edit bumps the contest's revision too, so renaming a tier
 * in another tab also invalidates a stale contest read here.
 *
 * **A full tier replacement is opt-in.** The backend deletes omitted tiers only when
 * `replace_tiers` is sent, so this editor sends the complete collection *and* says so,
 * which is the case `API_CONTRACT.md` permits. Tiers marked for deletion travel as
 * `pending_delete` rather than simply being dropped, so the intent is explicit in the
 * payload instead of inferred from an absence.
 */

import { useEffect, useMemo, useState } from 'react';

import '../contests.css';
import {
  useContestSettingsMutations,
  useEditableContests,
  useEditorOptions,
} from '../hooks/use-contests';
import type {
  EditableContest,
  EditableTier,
  LevelOption,
  ThresholdMetric,
  TierSubmission,
} from '../types';
import { TierEditor } from './tier-editor';

/** Expand the two stored level columns back into a ticked set. */
function selectedLevelsFor(tier: EditableTier, levels: LevelOption[]): string[] {
  const codes = levels.map((level) => level.code);
  const only = tier.only_levels ? tier.only_levels.split(',').filter(Boolean) : [];
  const restricted = tier.restricted_levels
    ? tier.restricted_levels.split(',').filter(Boolean)
    : [];
  if (only.length) return only;
  if (restricted.length) return codes.filter((code) => !restricted.includes(code));
  return codes;
}

/** A brand-new tier: everyone except NON, per the data contract's default. */
function blankTier(order: number): EditableTier {
  return {
    tier_order: order,
    tier_name: '',
    reward: '',
    notes: '',
    non_license: false,
    is_hidden: false,
    only_levels: '',
    restricted_levels: 'NON',
    tier_period_mode: 'inherit',
    tier_start: null,
    tier_end: null,
    tier_rolling_days: null,
    thresholds: {},
  };
}

export function ContestSettings() {
  const { data: options, isLoading: loadingOptions } = useEditorOptions(true);
  const { data: contests, isLoading: loadingContests, refetch } = useEditableContests(true);
  const mutations = useContestSettingsMutations();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditableContest | null>(null);
  const [levelSelection, setLevelSelection] = useState<Record<number, string[]>>({});
  const [message, setMessage] = useState<string>('');
  const [conflict, setConflict] = useState(false);

  const active = useMemo(
    () => contests?.find((contest) => contest.id === selectedId) ?? null,
    [contests, selectedId]
  );

  // Re-seed the draft whenever a different contest is selected, or the server hands
  // back a fresh payload after a save — the new revisions have to reach the form or
  // the next save conflicts with itself.
  useEffect(() => {
    if (!active || !options) return;
    setDraft(structuredClone(active));
    setLevelSelection(
      Object.fromEntries(
        active.tiers.map((tier, index) => [
          tier.id ?? -index - 1,
          selectedLevelsFor(tier, options.levels),
        ])
      )
    );
    setConflict(false);
  }, [active, options]);

  const patchTier = (index: number, patch: Partial<EditableTier>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            tiers: current.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
          }
        : current
    );

  const tierKey = (tier: EditableTier, index: number) => tier.id ?? -index - 1;

  const handleSave = async () => {
    if (!draft) return;
    setMessage('');
    setConflict(false);

    const tiers: TierSubmission[] = draft.tiers.map((tier, index) => ({
      id: tier.id,
      revision: tier.revision,
      tier_order: tier.tier_order || index + 1,
      tier_name: tier.tier_name,
      reward: tier.reward,
      notes: tier.notes,
      non_license: tier.non_license,
      is_hidden: tier.is_hidden,
      levels: levelSelection[tierKey(tier, index)] ?? [],
      tier_period_mode: tier.tier_period_mode,
      tier_start: tier.tier_start,
      tier_end: tier.tier_end,
      tier_rolling_days: tier.tier_rolling_days,
      // Sent as strings so the backend's own parser owns grouping, maxima and the
      // whole-number rule rather than this form re-implementing them.
      thresholds: Object.fromEntries(
        Object.entries(tier.thresholds)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([metric, value]) => [metric as ThresholdMetric, String(value)])
      ),
      pending_delete: tier.pending_delete,
    }));

    try {
      await mutations.save.mutateAsync({
        contestId: draft.id,
        body: {
          revision: draft.revision,
          contest_name: draft.name,
          contest_status: draft.contest_status,
          period_mode: draft.period_mode,
          qualifying_start: draft.qualifying_start,
          qualifying_end: draft.qualifying_end,
          rolling_days: draft.rolling_days,
          notes: draft.notes,
          tiers,
          // Explicit, because the backend will not infer a full replacement.
          replace_tiers: true,
        },
      });
      setMessage('Saved.');
    } catch (error) {
      const failure = error as { code?: string; message?: string };
      if (failure.code === 'edit_conflict') setConflict(true);
      setMessage(failure.message ?? 'The contest could not be saved.');
    }
  };

  const handleCreate = async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const created = await mutations.create.mutateAsync({
        contest_name: 'New contest',
        contest_status: 'considered',
        period_mode: 'fixed',
        qualifying_start: today,
        qualifying_end: today,
      });
      setSelectedId(created.id);
      setMessage('Created. It stays out of every reader surface until you announce it.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (loadingOptions || loadingContests) return <p className="wb-ct-state">Loading…</p>;
  if (!options) return <p className="wb-ct-state">Settings are unavailable.</p>;

  return (
    <div className="wb-ct-settings">
      <aside className="wb-ct-settings-list">
        <div className="wb-ct-header">
          <h2 className="wb-ct-title">Contests</h2>
          <button type="button" className="wb-ct-pill" onClick={handleCreate}>
            New
          </button>
        </div>
        <ul>
          {contests?.map((contest) => (
            <li key={contest.id}>
              <button
                type="button"
                className={`wb-ct-settings-item${
                  contest.id === selectedId ? ' wb-ct-settings-item--active' : ''
                }`}
                onClick={() => setSelectedId(contest.id)}
              >
                <span>{contest.name}</span>
                <small>
                  {contest.contest_status}
                  {contest.hidden ? ' · hidden' : ''}
                </small>
              </button>
            </li>
          ))}
        </ul>
        {!contests?.length ? <p className="wb-ct-state">No contests yet.</p> : null}
      </aside>

      <section className="wb-ct-settings-editor">
        {!draft ? (
          <p className="wb-ct-state">Select a contest, or create one.</p>
        ) : (
          <>
            <div className="wb-ct-editor-row">
              <label className="wb-ct-field wb-ct-field--grow">
                <span>Name</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>

              <label className="wb-ct-field">
                <span>Status</span>
                <select
                  value={draft.contest_status}
                  onChange={(event) =>
                    setDraft({ ...draft, contest_status: event.target.value })
                  }
                >
                  {options.contest_statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wb-ct-field">
                <span>Period</span>
                <select
                  value={draft.period_mode}
                  onChange={(event) =>
                    setDraft({ ...draft, period_mode: event.target.value })
                  }
                >
                  {options.period_modes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wb-ct-editor-row">
              {draft.period_mode === 'fixed' ? (
                <>
                  <label className="wb-ct-field">
                    <span>From</span>
                    <input
                      type="date"
                      value={draft.qualifying_start ?? ''}
                      onChange={(event) =>
                        setDraft({ ...draft, qualifying_start: event.target.value || null })
                      }
                    />
                  </label>
                  <label className="wb-ct-field">
                    <span>To</span>
                    <input
                      type="date"
                      value={draft.qualifying_end ?? ''}
                      onChange={(event) =>
                        setDraft({ ...draft, qualifying_end: event.target.value || null })
                      }
                    />
                  </label>
                </>
              ) : null}

              {draft.period_mode === 'rolling' ? (
                <label className="wb-ct-field">
                  <span>Days</span>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={draft.rolling_days ?? ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        rolling_days: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </label>
              ) : null}

              <label className="wb-ct-field wb-ct-field--grow">
                <span>Notes (never shown to readers)</span>
                <input
                  type="text"
                  value={draft.notes}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                />
              </label>
            </div>

            <h3 className="wb-ct-title">Tiers</h3>
            {draft.tiers.map((tier, index) => (
              <TierEditor
                key={tierKey(tier, index)}
                tier={tier}
                index={index}
                levels={options.levels}
                metrics={options.metrics}
                selectedLevels={levelSelection[tierKey(tier, index)] ?? []}
                onChange={(patch) => patchTier(index, patch)}
                onLevelsChange={(codes) =>
                  setLevelSelection((current) => ({
                    ...current,
                    [tierKey(tier, index)]: codes,
                  }))
                }
                onToggleHidden={() => patchTier(index, { is_hidden: !tier.is_hidden })}
                onDelete={() => patchTier(index, { pending_delete: !tier.pending_delete })}
              />
            ))}

            <button
              type="button"
              className="wb-ct-more"
              onClick={() =>
                setDraft({
                  ...draft,
                  tiers: [...draft.tiers, blankTier(draft.tiers.length + 1)],
                })
              }
            >
              Add a tier
            </button>

            <FlyerPanel draft={draft} mutations={mutations} onMessage={setMessage} />

            <div className="wb-ct-header-actions wb-ct-settings-actions">
              <button
                type="button"
                className="wb-ct-more"
                onClick={handleSave}
                disabled={mutations.save.isPending}
              >
                {mutations.save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="wb-ct-pill"
                onClick={() =>
                  mutations.setHidden.mutate({
                    contestId: draft.id,
                    hidden: !draft.hidden,
                    revision: draft.revision,
                  })
                }
              >
                {draft.hidden ? 'Unhide contest' : 'Hide contest'}
              </button>
              <button
                type="button"
                className="wb-ct-pill"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${draft.name}"? It leaves every list. The record is kept, ` +
                        'but there is no screen to restore it from.'
                    )
                  ) {
                    mutations.remove.mutate({
                      contestId: draft.id,
                      revision: draft.revision,
                    });
                    setSelectedId(null);
                  }
                }}
              >
                Delete contest
              </button>
            </div>

            {message ? (
              <p className={`wb-ct-note${conflict ? ' wb-ct-note--warn' : ''}`} role="status">
                {message}
                {conflict ? (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="wb-ct-pill"
                      onClick={() => {
                        refetch();
                        setConflict(false);
                        setMessage('');
                      }}
                    >
                      Reload
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * Flyer upload, publication and removal.
 *
 * Upload and publish are separate actions on purpose: deciding that a flyer exists
 * and deciding that the world may see it are different decisions, and the second must
 * not require redoing the first. The backend refuses to publish a flyer that is not
 * there.
 */
function FlyerPanel({
  draft,
  mutations,
  onMessage,
}: {
  draft: EditableContest;
  mutations: ReturnType<typeof useContestSettingsMutations>;
  onMessage: (message: string) => void;
}) {
  return (
    <div className="wb-ct-editor-row wb-ct-flyer-panel">
      <label className="wb-ct-field wb-ct-field--grow">
        <span>Flyer</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await mutations.uploadFlyer.mutateAsync({
                contestId: draft.id,
                file,
                revision: draft.revision,
              });
              onMessage('Flyer uploaded.');
            } catch (error) {
              // The server checks the real bytes, so a renamed file is refused here
              // rather than by the accept attribute, which is only a hint.
              onMessage((error as Error).message);
            } finally {
              event.target.value = '';
            }
          }}
        />
        {draft.flyer_original_name ? (
          <small>{draft.flyer_original_name}</small>
        ) : (
          <small>JPEG, PNG, WebP or PDF, up to 15 MiB.</small>
        )}
      </label>

      <label className="wb-ct-check wb-ct-field">
        <input
          type="checkbox"
          checked={draft.flyer_visible}
          disabled={!draft.flyer_original_name}
          onChange={(event) =>
            mutations.setFlyerVisible.mutate({
              contestId: draft.id,
              visible: event.target.checked,
              revision: draft.revision,
            })
          }
        />
        <span>Show to readers</span>
      </label>

      {draft.flyer_original_name ? (
        <button
          type="button"
          className="wb-ct-pill"
          onClick={() =>
            mutations.removeFlyer.mutate({
              contestId: draft.id,
              revision: draft.revision,
            })
          }
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
