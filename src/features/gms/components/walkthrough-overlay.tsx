/**
 * The running walkthrough: a spotlight on a real control, and a panel beside it.
 *
 * New work with no precedent in this repo, so the rules it has to honour are worth
 * stating where they are implemented:
 *
 * - **The spotlight never blocks the control.** `pointer-events: none` on the ring, and
 *   no full-screen click-catcher. The user is operating the live tool through this, and
 *   an overlay that swallowed the click would make the walkthrough impossible to finish.
 * - **A satisfied step shows "Already complete" and offers Next or End.** It does not
 *   advance itself. `OWNER_DECISIONS.md` is explicit — "do not silently rush forward" —
 *   and rushing is exactly what a well-meaning auto-advance would do.
 * - **Exit warns when unsaved tool data may be lost**, and says plainly that saved work
 *   stays saved. Those are different things and conflating them would frighten people
 *   out of finishing.
 * - **It never traps the user.** End is always reachable, Escape works, and the panel is
 *   positioned away from the spotlight rather than over it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { attachAdapter, detachAdapter } from '../services/gms-adapter';
import type { WalkthroughStepState } from '../types';

interface WalkthroughOverlayProps {
  toolKey: string;
  topicKey: string;
  title: string;
  steps: WalkthroughStepState[];
  currentStepKey: string;
  isPreview: boolean;
  /** Whether the tool currently holds unsaved input; drives the exit warning. */
  hasUnsavedToolData?: boolean;
  onAdvance: (stepKey: string) => void;
  onEnd: () => void;
  onComplete: (signal: string) => void;
}

/** Find the live element carrying a stable target key. */
function findTarget(targetKey: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-gms-target="${targetKey}"]`);
}

/** Track a target's on-screen box, following scroll and resize. */
function useTargetRect(targetKey: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const element = findTarget(targetKey);
      setRect(element ? element.getBoundingClientRect() : null);
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [targetKey]);

  return rect;
}

export function WalkthroughOverlay({
  toolKey,
  topicKey,
  title,
  steps,
  currentStepKey,
  isPreview,
  hasUnsavedToolData = false,
  onAdvance,
  onEnd,
  onComplete,
}: WalkthroughOverlayProps) {
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [refusal, setRefusal] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);

  const index = steps.findIndex((step) => step.step_key === currentStepKey);
  const step = index >= 0 ? steps[index] : null;
  const isFinalStep = index === steps.length - 1;
  const rect = useTargetRect(step?.target_key ?? '');

  // Register this walkthrough as the recipient of adapter signals while it runs, and
  // deregister on unmount so a stale overlay can never receive one.
  useEffect(() => {
    if (!step) return undefined;
    attachAdapter({
      toolKey,
      topicKey,
      stepKey: step.step_key,
      onAccepted: () => {
        setRefusal('');
        if (isFinalStep) onComplete(step.completion_signal_key);
        else onAdvance(step.step_key);
      },
      onRefused: (code, detail) => {
        // An incompatible target means the screen and the manifest disagree. Say so;
        // never fall back to a guess at which control was meant.
        setRefusal(
          code === 'walkthrough_incompatible'
            ? 'This walkthrough no longer matches the screen, so it has stopped here.'
            : detail || 'That action was not the one this step is waiting for.'
        );
      },
    });
    return () => detachAdapter();
  }, [toolKey, topicKey, step, isFinalStep, onAdvance, onComplete]);

  const requestExit = useCallback(() => {
    if (hasUnsavedToolData) setConfirmingExit(true);
    else onEnd();
  }, [hasUnsavedToolData, onEnd]);

  // Escape ends the walkthrough (through the same warning), so nobody is ever trapped.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestExit]);

  if (!step) return null;

  const missingTarget = rect === null;

  return createPortal(
    <>
      {rect ? (
        <div
          className="wb-gms-spotlight"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
          aria-hidden="true"
        />
      ) : null}

      <div
        ref={panelRef}
        className="wb-gms-step-panel"
        role="dialog"
        aria-label={`${title} — step ${index + 1} of ${steps.length}`}
      >
        <div className="wb-gms-step-panel__body">
          {isPreview ? (
            <div className="wb-gms-note wb-gms-note--warning">
              Preview. No XP and no completion are recorded — but the tool underneath is
              live, so anything you save is real.
            </div>
          ) : null}

          {step.already_complete ? (
            <div className="wb-gms-already-complete">
              <strong>Already complete.</strong>{' '}
              {step.already_complete_detail ||
                'This step is done. Carry on when you are ready.'}
            </div>
          ) : null}

          {missingTarget ? (
            <div className="wb-gms-note wb-gms-note--caution" role="alert">
              We cannot find the control this step points at on the current screen, so
              the walkthrough has stopped rather than guessing.
            </div>
          ) : null}

          {refusal ? (
            <div className="wb-gms-note wb-gms-note--caution" role="alert">
              {refusal}
            </div>
          ) : null}

          <p>{step.instruction}</p>

          {step.optional_step ? (
            <p className="wb-gms-entry__meta">
              Optional — add as much or as little as you like; it will not hold you up.
            </p>
          ) : null}
        </div>

        <div className="wb-gms-step-panel__footer">
          <span className="wb-gms-step-panel__progress">
            Step {index + 1} of {steps.length}
          </span>

          {/*
            Next appears when the step is already satisfied, or when it is optional.
            It never appears on an unsatisfied required step: the point of the
            walkthrough is that the real action happens, not that the panel is clicked
            through.
          */}
          {step.already_complete || step.optional_step ? (
            <button
              type="button"
              className="wb-gms-entry"
              style={{ width: 'auto', marginBottom: 0 }}
              onClick={() =>
                isFinalStep
                  ? onComplete(step.completion_signal_key)
                  : onAdvance(step.step_key)
              }
            >
              Next
            </button>
          ) : null}

          {step.allow_end ? (
            <button
              type="button"
              className="wb-gms-entry"
              style={{ width: 'auto', marginBottom: 0 }}
              onClick={requestExit}
            >
              End
            </button>
          ) : null}
        </div>
      </div>

      {confirmingExit ? (
        <div className="wb-gms-step-panel" role="alertdialog" aria-label="Leave walkthrough">
          <div className="wb-gms-step-panel__body">
            <p>
              <strong>Leave this walkthrough?</strong>
            </p>
            <p>
              Anything you have already saved stays saved. Anything typed into the form
              but not yet saved will be lost.
            </p>
          </div>
          <div className="wb-gms-step-panel__footer">
            <button
              type="button"
              className="wb-gms-entry"
              style={{ width: 'auto', marginBottom: 0 }}
              onClick={() => setConfirmingExit(false)}
            >
              Stay
            </button>
            <button
              type="button"
              className="wb-gms-entry"
              style={{ width: 'auto', marginBottom: 0 }}
              onClick={onEnd}
            >
              Leave
            </button>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
