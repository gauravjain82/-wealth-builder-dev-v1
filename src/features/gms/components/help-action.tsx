/**
 * The labelled top-right Help action, and everything it owns.
 *
 * Wrapped in an error boundary because `APPLICATION_CONTRACT.md` requires that a GMS
 * failure never impairs the tool underneath. If anything in here throws, the button
 * disappears and the page carries on — which is the correct outcome for a help feature
 * and the wrong one for almost anything else.
 *
 * The button renders only where there is a tool to help with and the user holds
 * `gms:read`. It is not a global chrome element looking for something to say.
 */

import { Component, type ErrorInfo, type ReactNode, useCallback, useState } from 'react';

import { useGmsAccess, useWalkthrough, useWalkthroughActions } from '../hooks/use-gms';
import type { TopicSummary } from '../types';
import { HelpDrawer } from './help-drawer';
import { WalkthroughOverlay } from './walkthrough-overlay';
import { WalkthroughStartPanel } from './walkthrough-start-panel';
import '../gms.css';

interface HelpActionProps {
  /** The tool this page belongs to, e.g. `bpm`. */
  toolKey: string;
  /** Optional narrowing to one location on the page. */
  locationKey?: string;
  /**
   * Host identifiers the tool already holds — for BPM, the sticky occurrence. Read from
   * the tool's own context; GMS never asks the user for them.
   */
  contextIds?: Record<string, number>;
  /** Whether the tool currently holds unsaved input, for the exit warning. */
  hasUnsavedToolData?: boolean;
}

/** Keeps a GMS failure inside GMS. */
class GmsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Logged, not surfaced. The person using the tool did not ask for help with help.
    console.error('GMS failed and was disabled for this page', error, info);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function HelpActionInner({
  toolKey,
  locationKey,
  contextIds = {},
  hasUnsavedToolData = false,
}: HelpActionProps) {
  const { data: access } = useGmsAccess();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chosen, setChosen] = useState<TopicSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [currentStepKey, setCurrentStepKey] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  const topicKey = chosen?.topic_key ?? null;
  const { data: detail } = useWalkthrough(toolKey, topicKey, contextIds);
  const actions = useWalkthroughActions(toolKey, topicKey ?? '');

  const onStart = useCallback(
    (preview: boolean) => {
      actions.start.mutate(
        { contextIds, isPreview: preview },
        {
          onSuccess: (progress) => {
            setIsPreview(preview);
            setCurrentStepKey(progress.current_step_key);
            setRunning(true);
            setDrawerOpen(false);
          },
        }
      );
    },
    [actions.start, contextIds]
  );

  const onResume = useCallback(() => {
    if (!detail?.progress) return;
    setIsPreview(detail.progress.is_preview);
    setCurrentStepKey(detail.progress.current_step_key);
    setRunning(true);
    setDrawerOpen(false);
  }, [detail]);

  const onEnd = useCallback(() => {
    actions.end.mutate('');
    setRunning(false);
    setChosen(null);
  }, [actions.end]);

  const onComplete = useCallback(
    (signal: string) => {
      actions.complete.mutate(signal, {
        onSuccess: () => {
          setRunning(false);
          setChosen(null);
        },
      });
    },
    [actions.complete]
  );

  // Hidden entirely when GMS is off or the user is not in the rollout. The backend
  // enforces the same gate independently; this only decides whether to render.
  if (!access?.gms_enabled || !access?.can_view) return null;

  return (
    <>
      <button
        type="button"
        className="header__bell-button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open help for this page"
        title="Help"
      >
        ?
      </button>

      <HelpDrawer
        toolKey={toolKey}
        locationKey={locationKey}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChooseWalkthrough={(topic) => setChosen(topic)}
      />

      {/* The pre-start panel lives in the drawer once a walkthrough is chosen. */}
      {chosen && detail && !running ? (
        <div className="wb-gms-drawer">
          <header className="wb-gms-drawer__header">
            <h2 className="wb-gms-drawer__title">{detail.title}</h2>
            <button type="button" onClick={() => setChosen(null)} aria-label="Close">
              ✕
            </button>
          </header>
          <div className="wb-gms-drawer__body">
            <WalkthroughStartPanel
              detail={detail}
              canPreview={Boolean(access?.can_author)}
              starting={actions.start.isPending}
              error={
                actions.start.error instanceof Error
                  ? actions.start.error.message
                  : undefined
              }
              onStart={onStart}
              onResume={onResume}
            />
          </div>
        </div>
      ) : null}

      {running && chosen && detail ? (
        <WalkthroughOverlay
          toolKey={toolKey}
          topicKey={chosen.topic_key}
          title={detail.title}
          // Step state is served with the detail payload; the overlay renders it and
          // never decides for itself whether a step is satisfied.
          steps={detail.steps}
          currentStepKey={currentStepKey}
          isPreview={isPreview}
          hasUnsavedToolData={hasUnsavedToolData}
          onAdvance={(stepKey) => setCurrentStepKey(stepKey)}
          onEnd={onEnd}
          onComplete={onComplete}
        />
      ) : null}
    </>
  );
}

/** The Help action, with GMS failures contained. */
export function HelpAction(props: HelpActionProps) {
  return (
    <GmsBoundary>
      <HelpActionInner {...props} />
    </GmsBoundary>
  );
}
