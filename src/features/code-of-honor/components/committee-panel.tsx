/**
 * Committee review: the only screen with names before a month closes.
 *
 * Each act shows the original and the hidden version side by side, with a prominent
 * warning when an identifier survived redaction. Completing is irreversible and is
 * confirmed in a dialog that names the month. When completion answers 409 the tied acts
 * come back in the error detail and this screen offers a runoff (when the server says
 * one is possible) or a recorded committee order with a required reason.
 */

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { ConfirmationDialog } from '@/shared/components/ui/confirmation-dialog';
import { Modal } from '@/shared/components/ui/modal';

import {
  useAudit,
  useCycleAction,
  useReview,
  useReviewAct,
  useTieDecision,
  useWallState,
} from '../hooks/use-code-of-honor';
import { CohError } from '../services/code-of-honor-service';
import type { CycleSummary, ReviewAct, TiedAct } from '../types';
import { ActText } from './act-text';
import { Empty, ErrorNotice, Loading } from './states';
import { errorMessage } from './error-message';

const STATUS_LABEL: Record<CycleSummary['status'], string> = {
  open: 'Open for posts',
  voting: 'Voting',
  runoff: 'Runoff',
  closed: 'Closed',
};

interface TieState {
  cycleId: string;
  label: string;
  acts: TiedAct[];
  runoffAllowed: boolean;
}

export function CommitteePanel({ canManageCycles, canComplete }: { canManageCycles: boolean; canComplete: boolean }) {
  const [cycleId, setCycleId] = useState<string | null>(null);
  const review = useReview(cycleId);
  const cycleAction = useCycleAction();
  const [confirm, setConfirm] = useState<'open-voting' | 'complete' | null>(null);
  const [tie, setTie] = useState<TieState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (review.isLoading) return <Loading label="Loading review" />;
  if (review.isError || !review.data) return <ErrorNotice error={review.error} onRetry={() => review.refetch()} />;
  const { cycles, selected, acts, require_approval: requireApproval } = review.data;
  const live = selected.status === 'voting' || selected.status === 'runoff';

  const handleTieError = (error: unknown): boolean => {
    if (error instanceof CohError && (error.code === 'tie_runoff_required' || error.code === 'tie_decision_required')) {
      setTie({
        cycleId: selected.id,
        label: selected.label,
        acts: (error.detail.acts as TiedAct[]) ?? [],
        runoffAllowed: error.code === 'tie_runoff_required',
      });
      return true;
    }
    return false;
  };

  const runCycleAction = (kind: 'open-voting' | 'complete' | 'runoff') => {
    setNotice(null);
    cycleAction.mutate(
      { cycleId: selected.id, kind },
      {
        onSuccess: () => {
          setConfirm(null);
          setTie(null);
          setNotice(
            kind === 'open-voting'
              ? `Voting is open for ${selected.label}. New posts now go to next month.`
              : kind === 'runoff'
                ? 'The runoff is open: one like each, tied acts only.'
                : `${selected.label} is complete. Names are revealed and coins awarded.`
          );
        },
        onError: (error) => {
          setConfirm(null);
          handleTieError(error);
        },
      }
    );
  };

  return (
    <div className="wb-coh-committee">
      <div className="wb-coh-toolbar">
        <label className="wb-coh-label" htmlFor="wb-coh-review-month">Month</label>
        <select
          id="wb-coh-review-month"
          className="wb-coh-input wb-coh-input--inline"
          value={selected.id}
          onChange={(event) => setCycleId(event.target.value)}
        >
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.label} — {STATUS_LABEL[cycle.status]}
            </option>
          ))}
        </select>
      </div>

      <div className="wb-coh-statusbar">
        <span>
          <strong>{selected.label}</strong> · {STATUS_LABEL[selected.status]} · {selected.acts} acts · {selected.hidden}{' '}
          hidden · {selected.in_vote} in the vote
        </span>
        <span className="wb-coh-actions">
          {selected.status === 'open' && canManageCycles && (
            <Button type="button" onClick={() => setConfirm('open-voting')} disabled={cycleAction.isPending}>
              Open voting
            </Button>
          )}
          {live && canComplete && (
            <Button type="button" onClick={() => setConfirm('complete')} disabled={cycleAction.isPending}>
              Complete &amp; reveal
            </Button>
          )}
        </span>
      </div>
      {notice && <p className="wb-coh-success" role="status">{notice}</p>}
      {cycleAction.isError && !tie && <ErrorNotice error={cycleAction.error} />}

      {acts.length === 0 ? (
        <Empty>No acts in {selected.label} yet.</Empty>
      ) : (
        <ul className="wb-coh-list">
          {acts.map((act) => (
            <ReviewRow key={act.id} act={act} locked={selected.status === 'closed'} requireApproval={requireApproval} />
          ))}
        </ul>
      )}

      <AuditTrail cycleId={selected.id} />

      <ConfirmationDialog
        open={confirm === 'open-voting'}
        title={`Open voting for ${selected.label}?`}
        message="Members can start liking acts, and new posts will go to next month."
        confirmText="Open voting"
        loading={cycleAction.isPending}
        onConfirm={() => runCycleAction('open-voting')}
        onClose={() => setConfirm(null)}
      />
      <ConfirmationDialog
        open={confirm === 'complete'}
        title={`Complete ${selected.label}?`}
        message="This closes the vote, reveals every recognized member's name and awards coins. It cannot be undone."
        confirmText="Complete & reveal"
        loading={cycleAction.isPending}
        onConfirm={() => runCycleAction('complete')}
        onClose={() => setConfirm(null)}
      />
      {tie && (
        <TieDialog
          key={tie.acts.map((act) => act.id).join(',')}
          tie={tie}
          busy={cycleAction.isPending}
          onRunoff={() => runCycleAction('runoff')}
          onClose={() => setTie(null)}
          onSettled={(nextTie) => {
            if (nextTie) {
              setTie({ ...tie, acts: nextTie.acts, runoffAllowed: nextTie.runoffAllowed });
            } else {
              setTie(null);
              setNotice(`${tie.label} is complete. Names are revealed and coins awarded.`);
            }
          }}
        />
      )}
    </div>
  );
}

function ReviewRow({ act, locked, requireApproval }: { act: ReviewAct; locked: boolean; requireApproval: boolean }) {
  const reviewAct = useReviewAct();
  const [editing, setEditing] = useState<'text' | 'values' | null>(null);
  const busy = reviewAct.isPending;
  const run = (action: Parameters<typeof reviewAct.mutate>[0]['action']) =>
    reviewAct.mutate({ actId: act.id, action }, { onSuccess: () => setEditing(null) });

  return (
    <li className={act.review_state === 'hidden' ? 'wb-coh-review wb-coh-review--hidden' : 'wb-coh-review'}>
      <div className="wb-coh-review__head">
        <span>
          <strong>{act.nominee_name}</strong> <span className="wb-coh-muted">· posted by {act.submitter_name}</span>
        </span>
        <span className="wb-coh-muted">
          {act.review_state === 'hidden' ? 'Hidden' : act.in_vote ? 'In the vote' : 'Awaiting approval'} · {act.likes}{' '}
          {act.likes === 1 ? 'like' : 'likes'}
          {act.in_runoff && ` · runoff ${act.runoff_likes}`}
        </span>
      </div>
      {act.leftover_names.length > 0 && (
        <p className="wb-coh-warning" role="alert">
          Warning: the hidden version still shows {act.leftover_names.join(', ')}. Edit it before voting opens.
        </p>
      )}
      <div className="wb-coh-review__versions">
        <div>
          <span className="wb-coh-label">Original (names visible)</span>
          <p className="wb-coh-act__text">{act.text}</p>
        </div>
        <div>
          <span className="wb-coh-label">What voters see{act.anonymous_text_edited && ' (edited)'}</span>
          <ActText text={act.anonymous_text} />
        </div>
      </div>
      <div className="wb-coh-act__meta">
        <span className="wb-coh-tag">{act.primary_value_name}</span>
        {act.values_corrected && <span className="wb-coh-muted">values corrected</span>}
      </div>
      {reviewAct.isError && <ErrorNotice error={reviewAct.error} />}
      {!locked && (
        <div className="wb-coh-actions">
          {act.review_state === 'hidden' ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => run({ action: 'restore' })}>
              Restore
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => run({ action: 'hide' })}>
              Hide
            </Button>
          )}
          {requireApproval && act.review_state === 'submitted' && (
            <Button type="button" size="sm" disabled={busy} onClick={() => run({ action: 'approve' })}>
              Approve
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing('text')}>
            Edit hidden version
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing('values')}>
            Change value
          </Button>
        </div>
      )}
      {editing === 'text' && (
        <EditTextDialog
          act={act}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(text) => run({ action: 'edit_anonymous_text', text })}
        />
      )}
      {editing === 'values' && (
        <EditValuesDialog
          act={act}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(primary, secondary) =>
            run({ action: 'correct_values', primary_value: primary, secondary_values: secondary })
          }
        />
      )}
    </li>
  );
}

function EditTextDialog({ act, busy, onClose, onSave }: {
  act: ReviewAct; busy: boolean; onClose: () => void; onSave: (text: string) => void;
}) {
  const [text, setText] = useState(act.anonymous_text);
  return (
    <Modal contentClassName="wb-coh-modal" open title="Edit what voters see" onClose={onClose}>
      <form className="wb-coh-form" onSubmit={(event) => { event.preventDefault(); onSave(text); }}>
        <p className="wb-coh-muted">Use _____ where a name should be hidden. The original is never changed.</p>
        <label className="wb-coh-label" htmlFor="wb-coh-edit-text">Hidden version</label>
        <textarea
          id="wb-coh-edit-text"
          className="wb-coh-input wb-coh-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="wb-coh-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || !text.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditValuesDialog({ act, busy, onClose, onSave }: {
  act: ReviewAct; busy: boolean; onClose: () => void; onSave: (primary: string, secondary: string[]) => void;
}) {
  const state = useWallState();
  const [primary, setPrimary] = useState(act.primary_value);
  const [secondary, setSecondary] = useState<string[]>(act.secondary_values);
  const values = state.data?.values ?? [];
  const limit = state.data?.rules.max_secondary_values ?? 0;
  const allowSecondary = Boolean(state.data?.rules.allow_secondary_values);

  return (
    <Modal contentClassName="wb-coh-modal" open title="Change the value" onClose={onClose}>
      <form className="wb-coh-form" onSubmit={(event) => { event.preventDefault(); onSave(primary, secondary); }}>
        <label className="wb-coh-label" htmlFor="wb-coh-edit-value">Main value</label>
        <select
          id="wb-coh-edit-value"
          className="wb-coh-input"
          value={primary}
          onChange={(event) => {
            setPrimary(event.target.value);
            setSecondary((current) => current.filter((key) => key !== event.target.value));
          }}
        >
          {values.map((value) => <option key={value.key} value={value.key}>{value.name}</option>)}
        </select>
        {allowSecondary && (
          <fieldset className="wb-coh-field">
            <legend className="wb-coh-label">Also shows (up to {limit})</legend>
            <div className="wb-coh-chips">
              {values.filter((value) => value.key !== primary).map((value) => {
                const checked = secondary.includes(value.key);
                return (
                  <label key={value.key} className={checked ? 'wb-coh-chip wb-coh-chip--on' : 'wb-coh-chip'}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && secondary.length >= limit}
                      onChange={() =>
                        setSecondary((current) =>
                          checked ? current.filter((key) => key !== value.key) : [...current, value.key]
                        )
                      }
                    />
                    {value.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <p className="wb-coh-muted">The change is recorded in the audit trail.</p>
        <div className="wb-coh-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || !primary}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TieDialog({ tie, busy, onRunoff, onClose, onSettled }: {
  tie: TieState;
  busy: boolean;
  onRunoff: () => void;
  onClose: () => void;
  onSettled: (next: { acts: TiedAct[]; runoffAllowed: boolean } | null) => void;
}) {
  const decide = useTieDecision();
  // Keyed by the tied set in the parent, so a further tie reported after a decision
  // remounts this dialog with a fresh order and an empty reason.
  const [deciding, setDeciding] = useState(!tie.runoffAllowed);
  const [order, setOrder] = useState<TiedAct[]>(tie.acts);
  const [reason, setReason] = useState('');

  const move = (index: number, delta: number) =>
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  const submit = () =>
    decide.mutate(
      { cycleId: tie.cycleId, actIds: order.map((act) => act.id), reason: reason.trim() },
      {
        onSuccess: () => onSettled(null),
        onError: (error) => {
          if (error instanceof CohError && (error.code === 'tie_runoff_required' || error.code === 'tie_decision_required')) {
            onSettled({ acts: (error.detail.acts as TiedAct[]) ?? [], runoffAllowed: error.code === 'tie_runoff_required' });
          }
        },
      }
    );

  return (
    <Modal contentClassName="wb-coh-modal" open title={`${tie.label}: ${tie.acts.length} acts are tied`} onClose={onClose}>
      <div className="wb-coh-form">
        {!deciding ? (
          <>
            <p>The tie rule can't settle these places. Run a one-like runoff between just these acts, or record the committee's order.</p>
            <TiedList acts={tie.acts} />
            <div className="wb-coh-actions">
              <Button type="button" variant="outline" onClick={() => setDeciding(true)} disabled={busy}>
                Record a committee decision
              </Button>
              <Button type="button" onClick={onRunoff} disabled={busy}>
                {busy ? 'Starting…' : 'Start runoff'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>
              {tie.runoffAllowed
                ? 'Put the tied acts in the committee\'s order, best first.'
                : 'They are still tied. Put them in the committee\'s order, best first.'}{' '}
              Places already settled above them don't change.
            </p>
            <ol className="wb-coh-order">
              {order.map((act, index) => (
                <li key={act.id} className="wb-coh-order__item">
                  <span className="wb-coh-order__pos">{index + 1}</span>
                  <ActText text={act.text} />
                  <span className="wb-coh-actions">
                    <Button type="button" variant="outline" size="sm" aria-label="Move up" disabled={index === 0}
                      onClick={() => move(index, -1)}>↑</Button>
                    <Button type="button" variant="outline" size="sm" aria-label="Move down"
                      disabled={index === order.length - 1} onClick={() => move(index, 1)}>↓</Button>
                  </span>
                </li>
              ))}
            </ol>
            <label className="wb-coh-label" htmlFor="wb-coh-tie-reason">Reason (required — it is recorded)</label>
            <textarea
              id="wb-coh-tie-reason"
              className="wb-coh-input wb-coh-textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {decide.isError && !(decide.error instanceof CohError && decide.error.status === 409) && (
              <p className="wb-coh-error" role="alert">{errorMessage(decide.error)}</p>
            )}
            <div className="wb-coh-actions">
              {tie.runoffAllowed && (
                <Button type="button" variant="outline" onClick={() => setDeciding(false)} disabled={decide.isPending}>
                  Back
                </Button>
              )}
              <Button type="button" onClick={submit} disabled={decide.isPending || !reason.trim()}>
                {decide.isPending ? 'Recording…' : 'Record decision and complete'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function TiedList({ acts }: { acts: TiedAct[] }) {
  return (
    <ul className="wb-coh-list">
      {acts.map((act) => (
        <li key={act.id} className="wb-coh-act">
          <ActText text={act.text} />
          <span className="wb-coh-count">
            {act.likes} likes{act.runoff_likes ? ` · runoff ${act.runoff_likes}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AuditTrail({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false);
  const audit = useAudit(open ? cycleId : null);
  return (
    <section className="wb-coh-audit" aria-label="Audit trail">
      <Button type="button" variant="link" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Hide audit trail' : 'Show audit trail'}
      </Button>
      {open && audit.isLoading && <Loading label="Loading audit trail" />}
      {open && audit.isError && <ErrorNotice error={audit.error} onRetry={() => audit.refetch()} />}
      {open && audit.data && (
        audit.data.events.length === 0 ? (
          <Empty>Nothing recorded yet.</Empty>
        ) : (
          <ul className="wb-coh-audit__list">
            {audit.data.events.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                <span className="wb-coh-muted">{new Date(event.at).toLocaleString()}</span> · {event.actor || 'system'} ·{' '}
                {event.action.replace(/_/g, ' ')}
                {typeof event.detail.reason === 'string' && ` — “${event.detail.reason}”`}
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
