/**
 * Post an Act: the form on one side, the month's anonymous feed on the other (it scrolls
 * inside the form's height), and last month's podium underneath both.
 *
 * The form runs who → value → story: choosing the value first gives the writer a frame.
 * Each step marks itself done, and the button says what is still missing rather than
 * just sitting disabled.
 *
 * Preview is mandatory: the form only calls `acts/preview/`, shows the server's hidden
 * version, and only the explicit confirm calls `acts/`. The server recomputes the
 * redaction on submit; the preview text is never sent back.
 */

import { Check, Lock, Quote } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';

import coinFront from '../assets/coin-front.webp';
import { usePreviewAct, useSubmitAct, useWall } from '../hooks/use-code-of-honor';
import type { HonorValue, MemberOption, PreviewResponse, PublicRules, WallState } from '../types';
import { ActText } from './act-text';
import { MemberPicker } from './member-picker';
import { Podium } from './podium';
import { Empty, ErrorNotice, Loading } from './states';
import { errorMessage } from './error-message';

/** Accent per value, by the value's position in the admin's list (cycles past six). */
const VALUE_TONES = 6;

function toneOf(values: HonorValue[], name: string): number {
  const index = values.findIndex((value) => value.name === name);
  return index < 0 ? 0 : index % VALUE_TONES;
}

interface PostTabProps {
  state: WallState;
  canSubmit: boolean;
}

export function PostTab({ state, canSubmit }: PostTabProps) {
  const wall = useWall();
  const [justPosted, setJustPosted] = useState(false);

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
          {justPosted && (
            <p className="wb-coh-posted" role="status">
              <img src={coinFront} alt="" className="wb-coh-posted__coin" />
              <span>
                <strong>Posted.</strong> Their name stays hidden until voting closes.
                {data.slots_left > 0 && ` ${data.slots_left} left this month. Who else stood out?`}
              </span>
            </p>
          )}
          {!canSubmit ? (
            <Empty>Posting is open to active agents.</Empty>
          ) : data.slots_left === 0 ? (
            <div className="wb-coh-done">
              <p className="wb-coh-done__title">You’ve recognized {data.slots_total} teammates this month.</p>
              <p className="wb-coh-muted">Thank you. New spots open next month. Until then, watch the wall fill up.</p>
            </div>
          ) : (
            <PostForm state={state} onPosted={() => setJustPosted(true)} onStart={() => setJustPosted(false)} />
          )}
        </section>

        <section aria-label="This month's acts" className="wb-coh-panel wb-coh-panel--feed">
          <h3 className="wb-coh-heading">
            {data.feed.voting_live ? 'Which acts deserve the coins?' : 'This month on the wall'}
            <span className="wb-coh-muted"> · {data.feed.label}</span>
          </h3>
          {acts.length === 0 ? (
            <div className="wb-coh-invite">
              <Quote size={20} aria-hidden="true" />
              <p><strong>Be the first to post this month.</strong></p>
              <p className="wb-coh-muted">First posts set the tone for everyone else.</p>
            </div>
          ) : (
            <ul className="wb-coh-list wb-coh-feed">
              {acts.map((act) => (
                <li key={act.id} className={`wb-coh-act wb-coh-wall-act wb-coh-tone-${toneOf(state.values, act.value)}`}>
                  <ActText text={act.text} />
                  <div className="wb-coh-act__meta">
                    <span className="wb-coh-tag">{act.value}</span>
                    {act.values.map((value) => (
                      <span key={value} className="wb-coh-tag wb-coh-tag--soft">{value}</span>
                    ))}
                    {data.feed.totals_visible && act.likes !== undefined && act.likes > 0 && (
                      <span className="wb-coh-count">♥ {act.likes}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.latest && data.latest.winners.length > 0 && (
        <section aria-label="Last month's winners" className="wb-coh-latest">
          <h3 className="wb-coh-heading">
            Last month’s Guardians <span className="wb-coh-muted">· {data.latest.label}</span>
          </h3>
          <Podium entries={data.latest.winners} compact />
        </section>
      )}
    </div>
  );
}

function Step({ n, done, children }: { n: number; done: boolean; children: React.ReactNode }) {
  return (
    <div className={done ? 'wb-coh-step wb-coh-step--done' : 'wb-coh-step'}>
      <span className="wb-coh-step__num" aria-hidden="true">
        {done ? <Check size={14} strokeWidth={3} /> : n}
      </span>
      <div className="wb-coh-step__body">{children}</div>
    </div>
  );
}

function PostForm({ state, onPosted, onStart }: { state: WallState; onPosted: () => void; onStart: () => void }) {
  const { rules, values } = state;
  const [nominee, setNominee] = useState<MemberOption | null>(null);
  const [text, setText] = useState('');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const previewAct = usePreviewAct();
  const submit = useSubmitAct();

  const length = text.trim().length;
  const lengthOk = length >= rules.min_text_length && length <= rules.max_text_length;
  const ready = Boolean(nominee) && lengthOk && Boolean(primary) && !previewAct.isPending;
  const missing = [
    !nominee && 'pick a teammate',
    !primary && 'choose a value',
    !lengthOk && `write at least ${rules.min_text_length} characters`,
  ].filter(Boolean) as string[];

  const onPreview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nominee || !ready) return;
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
          onPosted();
        },
      }
    );
  };

  return (
    <form className="wb-coh-form wb-coh-steps" onSubmit={onPreview} noValidate>
      <Step n={1} done={Boolean(nominee)}>
        <MemberPicker
          value={nominee}
          onChange={(member) => {
            onStart();
            setNominee(member);
          }}
        />
      </Step>

      <Step n={2} done={Boolean(primary)}>
        <ValueTiles
          values={values}
          rules={rules}
          primary={primary}
          secondary={secondary}
          onChange={(nextPrimary, nextSecondary) => {
            setPrimary(nextPrimary);
            setSecondary(nextSecondary);
          }}
        />
      </Step>

      <Step n={3} done={lengthOk}>
        <StoryField text={text} rules={rules} onChange={setText} />
      </Step>

      <p className="wb-coh-trust">
        <Lock size={14} aria-hidden="true" />
        Their name is hidden until voting closes. You are never named.
      </p>

      {previewAct.isError && <ErrorNotice error={previewAct.error} />}
      <Button type="submit" className="wb-coh-cta" disabled={!ready}>
        {previewAct.isPending ? 'Preparing preview…' : 'Preview my recognition →'}
      </Button>
      {missing.length > 0 && (
        <p className="wb-coh-hint wb-coh-cta__missing">To continue: {missing.join(', ')}.</p>
      )}

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

/**
 * The values as tiles, each with its description. The first tile picked is the main
 * value; with extra values allowed, further taps add them (up to the rule's limit).
 * Tapping a chosen tile unpicks it; unpicking the main value promotes the first extra.
 */
function ValueTiles({ values, rules, primary, secondary, onChange }: {
  values: HonorValue[];
  rules: PublicRules;
  primary: string;
  secondary: string[];
  onChange: (primary: string, secondary: string[]) => void;
}) {
  const allowExtra = rules.allow_secondary_values && rules.max_secondary_values > 0;

  const toggle = (key: string) => {
    if (key === primary) {
      const [next = '', ...rest] = secondary;
      onChange(next, rest);
    } else if (secondary.includes(key)) {
      onChange(primary, secondary.filter((item) => item !== key));
    } else if (!primary) {
      onChange(key, secondary);
    } else if (allowExtra && secondary.length < rules.max_secondary_values) {
      onChange(primary, [...secondary, key]);
    } else if (!allowExtra) {
      onChange(key, []);
    }
  };

  return (
    <fieldset className="wb-coh-field">
      <legend className="wb-coh-label">Which value did they live?</legend>
      <p className="wb-coh-hint">
        {allowExtra
          ? `Your first pick is the main value. Tap up to ${rules.max_secondary_values} more if it showed those too.`
          : 'Pick the value it shows most.'}
      </p>
      <div className="wb-coh-tiles">
        {values.map((value, index) => {
          const isMain = value.key === primary;
          const isExtra = secondary.includes(value.key);
          const full = Boolean(primary) && allowExtra && !isMain && !isExtra && secondary.length >= rules.max_secondary_values;
          return (
            <button
              key={value.key}
              type="button"
              className={[
                'wb-coh-tile',
                `wb-coh-tone-${index % VALUE_TONES}`,
                isMain && 'wb-coh-tile--main',
                isExtra && 'wb-coh-tile--extra',
              ].filter(Boolean).join(' ')}
              aria-pressed={isMain || isExtra}
              disabled={full}
              onClick={() => toggle(value.key)}
            >
              <span className="wb-coh-tile__name">{value.name}</span>
              {value.description && <span className="wb-coh-tile__desc">{value.description}</span>}
              {(isMain || isExtra) && (
                <span className="wb-coh-tile__badge">{isMain ? 'Main' : 'Also'}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The story box: an example placeholder, prompts, and a meter that coaches instead of warning. */
function StoryField({ text, rules, onChange }: { text: string; rules: PublicRules; onChange: (text: string) => void }) {
  const length = text.trim().length;
  const goal = Math.min(Math.max(rules.min_text_length * 5, 150), rules.max_text_length);
  const fill = Math.min(length / goal, 1);
  const level = length === 0 ? 'empty' : length < rules.min_text_length ? 'short' : length < goal ? 'good' : 'great';
  const message = {
    empty: 'Start with what they did.',
    short: `Keep going: ${rules.min_text_length - length} more characters.`,
    good: 'Good start. What changed because of it?',
    great: 'Great detail. This is the kind of post that wins.',
  }[level];

  return (
    <div className="wb-coh-field">
      <label className="wb-coh-label" htmlFor="wb-coh-text">What did they do, and what did you see?</label>
      <textarea
        id="wb-coh-text"
        className="wb-coh-input wb-coh-textarea"
        value={text}
        maxLength={rules.max_text_length}
        placeholder="e.g. When the venue fell through, they found a new one in two hours and called every guest themselves."
        onChange={(event) => onChange(event.target.value)}
        aria-describedby="wb-coh-text-meter"
      />
      <div className={`wb-coh-meter wb-coh-meter--${level}`} aria-hidden="true">
        <span className="wb-coh-meter__fill" style={{ width: `${fill * 100}%` }} />
      </div>
      <div id="wb-coh-text-meter" className="wb-coh-meter__row">
        <span>{message}</span>
        <span className="wb-coh-muted">{length} / {rules.max_text_length}</span>
      </div>
    </div>
  );
}
