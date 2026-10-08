/**
 * Post an Act: the form on one side; on the other, the challenge coins with the month's
 * anonymous feed beneath them; and last month's podium underneath both.
 *
 * Preview is mandatory: the form only calls `acts/preview/`, shows the server's hidden
 * version and the identifiers it blanked, and only the explicit confirm calls `acts/`.
 * The server recomputes the redaction on submit; the preview text is never sent back.
 */

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';

import { usePreviewAct, useSubmitAct, useWall } from '../hooks/use-code-of-honor';
import type { MemberOption, PreviewResponse, WallState } from '../types';
import { ActText } from './act-text';
import { MemberPicker } from './member-picker';
import { Podium } from './podium';
import { Empty, ErrorNotice, Loading } from './states';
import { errorMessage } from './error-message';

interface PostTabProps {
  state: WallState;
  canSubmit: boolean;
}

export function PostTab({ state, canSubmit }: PostTabProps) {
  const wall = useWall();

  if (wall.isLoading) return <Loading label="Loading the wall" />;
  if (wall.isError || !wall.data) return <ErrorNotice error={wall.error} onRetry={() => wall.refetch()} />;
  const data = wall.data;
  // The server sends oldest first while counts are hidden; show the newest post on top.
  // Once counts are visible it ranks by likes, and that order is kept.
  const acts = data.feed.totals_visible ? data.feed.acts : [...data.feed.acts].reverse();

  return (
    <div className="wb-coh-post">
      <div className="wb-coh-post__columns">
        <section aria-label="Post an act" className="wb-coh-panel">
          <h3 className="wb-coh-heading">
            Recognize a teammate · {data.label}
            <span className="wb-coh-muted"> · {data.slots_left} of {data.slots_total} posts left</span>
          </h3>
          {!canSubmit ? (
            <Empty>Posting is open to active agents.</Empty>
          ) : data.slots_left === 0 ? (
            <Empty>You've posted all {data.slots_total} acts for {data.label}. New spots open next month.</Empty>
          ) : (
            <PostForm state={state} />
          )}
        </section>

        <section aria-label="This month's acts" className="wb-coh-panel wb-coh-panel--feed">
          <h3 className="wb-coh-heading">
            {data.feed.voting_live ? 'Which acts deserve the coins?' : 'What the team is posting'}
            <span className="wb-coh-muted"> · {data.feed.label}</span>
          </h3>
          {acts.length === 0 ? (
            <Empty>No acts yet this month.</Empty>
          ) : (
            <ul className="wb-coh-list wb-coh-feed">
              {acts.map((act) => (
                <li key={act.id} className="wb-coh-act">
                  <ActText text={act.text} />
                  <div className="wb-coh-act__meta">
                    <span className="wb-coh-tag">{act.value}</span>
                    {act.values.map((value) => (
                      <span key={value} className="wb-coh-tag wb-coh-tag--soft">{value}</span>
                    ))}
                    {data.feed.totals_visible && act.likes !== undefined && (
                      <span className="wb-coh-count">{act.likes} {act.likes === 1 ? 'like' : 'likes'}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.latest && (
        <section aria-label="Last month's winners" className="wb-coh-latest">
          <h3 className="wb-coh-heading">{data.latest.label} winners</h3>
          <Podium entries={data.latest.winners} compact />
        </section>
      )}
    </div>
  );
}

function PostForm({ state }: { state: WallState }) {
  const { rules, values } = state;
  const [nominee, setNominee] = useState<MemberOption | null>(null);
  const [text, setText] = useState('');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [posted, setPosted] = useState(false);
  const previewAct = usePreviewAct();
  const submit = useSubmitAct();

  const length = text.trim().length;
  const lengthOk = length >= rules.min_text_length && length <= rules.max_text_length;
  const ready = Boolean(nominee) && lengthOk && Boolean(primary) && !previewAct.isPending;

  const toggleSecondary = (key: string) =>
    setSecondary((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : current.length < rules.max_secondary_values
          ? [...current, key]
          : current
    );

  const onPreview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nominee || !ready) return;
    setPosted(false);
    previewAct.mutate({ nomineeId: nominee.id, text: text.trim() }, { onSuccess: setPreview });
  };

  const onConfirm = () => {
    if (!nominee) return;
    submit.mutate(
      { nominee_id: nominee.id, text: text.trim(), primary_value: primary, secondary_values: secondary },
      {
        onSuccess: () => {
          setPreview(null);
          setNominee(null);
          setText('');
          setPrimary('');
          setSecondary([]);
          setPosted(true);
        },
      }
    );
  };

  return (
    <form className="wb-coh-form" onSubmit={onPreview} noValidate>
      {posted && (
        <p className="wb-coh-success" role="status">
          Posted. The name stays hidden until voting closes.
        </p>
      )}
      <MemberPicker value={nominee} onChange={setNominee} />

      <div className="wb-coh-field">
        <label className="wb-coh-label" htmlFor="wb-coh-text">What did they do, and what did you see?</label>
        <textarea
          id="wb-coh-text"
          className="wb-coh-input wb-coh-textarea"
          value={text}
          maxLength={rules.max_text_length}
          onChange={(event) => setText(event.target.value)}
          aria-describedby="wb-coh-text-count"
        />
        <span id="wb-coh-text-count" className={lengthOk ? 'wb-coh-hint' : 'wb-coh-hint wb-coh-hint--warn'}>
          {length} / {rules.max_text_length}
          {length < rules.min_text_length && ` · at least ${rules.min_text_length} characters`}
        </span>
      </div>

      <div className="wb-coh-field">
        <label className="wb-coh-label" htmlFor="wb-coh-value">Which Code of Honor value does it show?</label>
        <select
          id="wb-coh-value"
          className="wb-coh-input"
          value={primary}
          onChange={(event) => {
            setPrimary(event.target.value);
            setSecondary((current) => current.filter((key) => key !== event.target.value));
          }}
        >
          <option value="">Choose a value</option>
          {values.map((value) => (
            <option key={value.key} value={value.key}>{value.name}</option>
          ))}
        </select>
      </div>

      {rules.allow_secondary_values && primary && (
        <fieldset className="wb-coh-field">
          <legend className="wb-coh-label">
            Also shows (optional, up to {rules.max_secondary_values})
          </legend>
          <div className="wb-coh-chips">
            {values
              .filter((value) => value.key !== primary)
              .map((value) => {
                const checked = secondary.includes(value.key);
                const full = !checked && secondary.length >= rules.max_secondary_values;
                return (
                  <label key={value.key} className={checked ? 'wb-coh-chip wb-coh-chip--on' : 'wb-coh-chip'}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={full}
                      onChange={() => toggleSecondary(value.key)}
                    />
                    {value.name}
                  </label>
                );
              })}
          </div>
        </fieldset>
      )}

      {previewAct.isError && <ErrorNotice error={previewAct.error} />}
      <Button type="submit" disabled={!ready}>
        {previewAct.isPending ? 'Preparing preview…' : 'Preview'}
      </Button>

      <Modal
        contentClassName="wb-coh-modal"
        open={Boolean(preview)}
        title="Check the hidden version"
        onClose={() => setPreview(null)}
        dismissible={!submit.isPending}
      >
        {preview && (
          <div className="wb-coh-preview">
            <p className="wb-coh-muted">This is exactly what the team will see while voting is open.</p>
            <div className="wb-coh-act wb-coh-act--preview">
              <ActText text={preview.anonymous_text} />
            </div>
            {preview.blanks.length === 0 && (
              <p className="wb-coh-hint">No mention of your teammate was found to hide.</p>
            )}
            <p className="wb-coh-hint">Their name is revealed when voting closes. You are never named.</p>
            {submit.isError && <p className="wb-coh-error" role="alert">{errorMessage(submit.error)}</p>}
            <div className="wb-coh-actions">
              <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={submit.isPending}>
                Back to edit
              </Button>
              <Button type="button" onClick={onConfirm} disabled={submit.isPending}>
                {submit.isPending ? 'Posting…' : 'Confirm and post'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </form>
  );
}
