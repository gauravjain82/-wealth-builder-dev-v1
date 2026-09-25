/**
 * What a user sees before a walkthrough starts.
 *
 * `UI_CONTRACT.md` requires purpose, estimated effort, hard prerequisites, recommended
 * preparation, the automatically checked results, the real-data notice, and Start. Three
 * of those are easy to get subtly wrong, so they are handled explicitly:
 *
 * - **A failed hard prerequisite blocks Start and explains the resolution.** Start is
 *   disabled, not hidden, and the reason is next to it. Hiding it would leave somebody
 *   wondering whether the feature is broken.
 * - **An unverifiable hard prerequisite also blocks**, and says it could not be checked
 *   rather than implying failure. "We could not verify that you may do this" is not
 *   permission to proceed, and it is not an accusation either.
 * - **Recommended preparation never blocks**, and where the host cannot check it the
 *   panel says so plainly instead of showing a tick nobody earned.
 *
 * The live-data notice is not boilerplate. Saving in the BPM pilot creates a real
 * prospect, writes a real note and sends a real invitation email, so the warning names
 * that rather than saying "records are updated".
 */

import { useState } from 'react';

import type { Prerequisite, WalkthroughDetail } from '../types';

interface WalkthroughStartPanelProps {
  detail: WalkthroughDetail;
  onStart: (isPreview: boolean) => void;
  onResume: () => void;
  canPreview: boolean;
  starting: boolean;
  error?: string;
}

/** Icon and label for one evaluated prerequisite. */
function outcomeMarks(prerequisite: Prerequisite): { icon: string; label: string } {
  if (prerequisite.outcome === 'pass') return { icon: '✓', label: 'Ready' };
  if (prerequisite.outcome === 'fail') return { icon: '✗', label: 'Not ready' };
  return prerequisite.requirement_level === 'hard'
    ? { icon: '?', label: 'Could not be checked' }
    : { icon: '•', label: 'Up to you' };
}

function PrerequisiteRow({ prerequisite }: { prerequisite: Prerequisite }) {
  const { icon, label } = outcomeMarks(prerequisite);
  return (
    <li className="wb-gms-prereq">
      <span className="wb-gms-prereq__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="wb-gms-prereq__title">{prerequisite.title}</span>
        <span className="sr-only"> — {label}</span>
        {prerequisite.detail || prerequisite.instruction ? (
          <span className="wb-gms-prereq__detail">
            {prerequisite.detail || prerequisite.instruction}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function WalkthroughStartPanel({
  detail,
  onStart,
  onResume,
  canPreview,
  starting,
  error,
}: WalkthroughStartPanelProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const hard = detail.prerequisites.filter((item) => item.requirement_level === 'hard');
  const recommended = detail.prerequisites.filter(
    (item) => item.requirement_level === 'recommended'
  );
  const blocking = detail.prerequisites.filter((item) => item.blocks_start);

  if (!detail.available) {
    // A broken walkthrough is reported, never guessed through.
    return (
      <div className="wb-gms-section">
        <p>{detail.summary}</p>
        <div className="wb-gms-note wb-gms-note--caution">
          {detail.unavailable_reason}
        </div>
      </div>
    );
  }

  return (
    <div className="wb-gms-section">
      <p>{detail.summary}</p>
      <p className="wb-gms-entry__meta">
        {detail.step_count} step{detail.step_count === 1 ? '' : 's'}
        {detail.xp_available > 0
          ? ` · ${detail.xp_available} XP the first time you finish`
          : detail.already_awarded
            ? ' · you have already earned the XP for this one'
            : ''}
      </p>

      <div className="wb-gms-live-warning">
        <strong>This is the real tool.</strong>
        {detail.live_data_notice} If you leave part-way through, anything you have
        already saved stays saved, and anything unsaved is lost.
      </div>

      {hard.length > 0 ? (
        <>
          <h3 className="wb-gms-section__heading">Before you start</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {hard.map((item) => (
              <PrerequisiteRow key={item.prerequisite_key} prerequisite={item} />
            ))}
          </ul>
        </>
      ) : null}

      {recommended.length > 0 ? (
        <>
          <h3 className="wb-gms-section__heading">Worth having to hand</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recommended.map((item) => (
              <PrerequisiteRow key={item.prerequisite_key} prerequisite={item} />
            ))}
          </ul>
        </>
      ) : null}

      {blocking.length > 0 ? (
        <div className="wb-gms-note wb-gms-note--caution" role="alert">
          You cannot start yet:{' '}
          {blocking.map((item) => item.detail || item.title).join(' ')}
        </div>
      ) : null}

      {error ? (
        <div className="wb-gms-note wb-gms-note--caution" role="alert">
          {error}
        </div>
      ) : null}

      {detail.progress ? (
        <p>
          <button type="button" className="wb-gms-entry" onClick={onResume}>
            Resume where you left off
          </button>
        </p>
      ) : null}

      <label style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 0' }}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <span style={{ fontSize: '0.875rem' }}>
          I understand anything I save here is a real record.
        </span>
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="wb-gms-entry"
          style={{ width: 'auto' }}
          disabled={!detail.can_start || !acknowledged || starting}
          onClick={() => onStart(false)}
        >
          {starting ? 'Starting…' : 'Start'}
        </button>
        {canPreview ? (
          <button
            type="button"
            className="wb-gms-entry"
            style={{ width: 'auto' }}
            disabled={!detail.can_start || !acknowledged || starting}
            onClick={() => onStart(true)}
            // Preview is not a safe sandbox. It skips the XP and the completion record,
            // and nothing else — the tool underneath is still live.
            title="Preview records no completion or XP. Anything you save is still real."
          >
            Preview
          </button>
        ) : null}
      </div>
      {canPreview ? (
        <p className="wb-gms-entry__meta">
          Preview awards no XP and records no completion. It is still the live tool.
        </p>
      ) : null}
    </div>
  );
}
