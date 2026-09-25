/**
 * The Help drawer: what is relevant here, and nothing that is not.
 *
 * `UI_CONTRACT.md` is specific about the order and about what must *not* happen:
 * "Show authorized **Walk Me Through It** task choices first; reference and
 * troubleshooting topics follow" and "Do not recommend, auto-open, or expose workflows
 * from unrelated tools or unauthorized actions."
 *
 * So: three lists in that order, nothing highlighted as a suggestion, nothing opened for
 * the user, and the server decides what is in them. Ordering is not a ranking, and the
 * drawer opens on a list rather than on content.
 *
 * Portalled to `document.body` for the same reason the shared `Modal` is: a tool page
 * may be inside a clipped, scrolling container, and a drawer that respected that would
 * be cut off. Containment follows `contests.css`'s contract — see `gms.css`.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useHelpContext, useTopic } from '../hooks/use-gms';
import type { TopicSummary } from '../types';
import { ContentBlocks } from './content-blocks';

interface HelpDrawerProps {
  /** Which tool's Help to show. Null closes the drawer. */
  toolKey: string | null;
  /** Optional narrowing to one location on that tool's page. */
  locationKey?: string;
  open: boolean;
  onClose: () => void;
  /** Called when a user chooses a walkthrough, so the host can start it. */
  onChooseWalkthrough: (topic: TopicSummary) => void;
}

function TopicButton({
  topic,
  onSelect,
}: {
  topic: TopicSummary;
  onSelect: () => void;
}) {
  const unavailable = topic.available === false;
  return (
    <button
      type="button"
      className="wb-gms-entry"
      aria-disabled={unavailable}
      disabled={unavailable}
      onClick={onSelect}
    >
      <span className="wb-gms-entry__title">{topic.title}</span>
      {topic.summary ? (
        <span className="wb-gms-entry__meta">{topic.summary}</span>
      ) : null}
      {/*
        A disabled walkthrough says why. Omitting it would be worse: somebody told
        "there's a walkthrough for this" would conclude it never existed.
      */}
      {unavailable && topic.reason ? (
        <span className="wb-gms-entry__meta">{topic.reason}</span>
      ) : null}
      {!unavailable && topic.xp_available ? (
        <span className="wb-gms-entry__meta">{topic.xp_available} XP</span>
      ) : null}
    </button>
  );
}

export function HelpDrawer({
  toolKey,
  locationKey,
  open,
  onClose,
  onChooseWalkthrough,
}: HelpDrawerProps) {
  const [openTopicKey, setOpenTopicKey] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { data: context, isLoading, isError } = useHelpContext(
    open ? toolKey : null,
    locationKey
  );
  const { data: topic } = useTopic(open ? toolKey : null, openTopicKey);

  // Reset to the list each time the drawer opens: the drawer opens on choices, never
  // on content somebody did not ask for.
  useEffect(() => {
    if (open) setOpenTopicKey(null);
  }, [open, toolKey]);

  // Move focus into the drawer so a keyboard user is not left behind on the page.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const sections: Array<[string, TopicSummary[], boolean]> = [
    ['Walk me through it', context?.walkthroughs ?? [], true],
    ['Reference', context?.reference ?? [], false],
    ['Troubleshooting', context?.troubleshooting ?? [], false],
  ];
  const isEmpty =
    !isLoading && sections.every(([, entries]) => entries.length === 0);

  return createPortal(
    <aside
      className="wb-gms-drawer"
      role="complementary"
      aria-label="Help for this page"
    >
      <header className="wb-gms-drawer__header">
        <h2 className="wb-gms-drawer__title">
          {openTopicKey && topic ? topic.title : 'Help'}
        </h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close help">
          ✕
        </button>
      </header>

      <div className="wb-gms-drawer__body" tabIndex={-1}>
        {openTopicKey ? (
          <>
            <button
              type="button"
              className="wb-gms-entry"
              style={{ width: 'auto' }}
              onClick={() => setOpenTopicKey(null)}
            >
              ← All help
            </button>
            {topic ? <ContentBlocks blocks={topic.content} /> : <p>Loading…</p>}
          </>
        ) : (
          <>
            {isLoading ? <p>Loading…</p> : null}
            {isError ? (
              // A Help failure must never look like a tool failure.
              <p>Help is unavailable at the moment. The page itself is unaffected.</p>
            ) : null}
            {isEmpty ? <p>There is no help for this page yet.</p> : null}

            {sections.map(([heading, entries, isWalkthrough]) =>
              entries.length ? (
                <section className="wb-gms-section" key={heading}>
                  <h3 className="wb-gms-section__heading">{heading}</h3>
                  {entries.map((entry) => (
                    <TopicButton
                      key={`${entry.topic_key}-${heading}`}
                      topic={entry}
                      onSelect={() =>
                        isWalkthrough
                          ? onChooseWalkthrough(entry)
                          : setOpenTopicKey(entry.topic_key)
                      }
                    />
                  ))}
                </section>
              ) : null
            )}
          </>
        )}
      </div>
    </aside>,
    document.body
  );
}
