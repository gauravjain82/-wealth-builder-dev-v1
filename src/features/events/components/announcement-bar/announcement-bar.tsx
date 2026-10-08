import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Ticket } from 'lucide-react';
import { useAnnouncementBar } from '../../hooks/use-announcement-bar';
import './announcement-bar.css';

/** Ticker speed in px/s — slow enough to read comfortably. */
const SPEED_PX_PER_SECOND = 60;

/**
 * Site-wide event banner above the app header.
 *
 * The event phrases scroll as a ticker; for a viewer holding a ticket a fixed
 * "Get Ready! Manage ticket" button sits on the left — actionable text never moves.
 * The ticker pauses on hover/focus and via its pause button (WCAG 2.2.2), and is a
 * static line under `prefers-reduced-motion`. Renders nothing when no event is on.
 */
export function AnnouncementBar() {
  const { data } = useAnnouncementBar();
  const [paused, setPaused] = useState(false);

  const event = data?.event;
  const messages = data?.messages ?? [];
  if (!event || messages.length === 0) return null;

  const ticketCount = data?.ticket?.count ?? 0;
  const live = event.phase === 'live';

  return (
    <div className="announcement-bar" role="region" aria-label={`${event.name} announcement`}>
      {ticketCount > 0 ? (
        <Link to={`/events/${event.id}/my-tickets`} className="announcement-bar__cta">
          <Ticket className="announcement-bar__cta-icon" aria-hidden="true" />
          <span className="announcement-bar__cta-ready">Get Ready!</span>
          <span className="announcement-bar__cta-action">
            {ticketCount > 1 ? `Manage tickets (${ticketCount})` : 'Manage ticket'}
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      ) : null}

      {live ? (
        <span className="announcement-bar__live">
          <span className="announcement-bar__live-dot" aria-hidden="true" />
          Live
        </span>
      ) : null}

      <Ticker messages={messages} paused={paused} />

      <button
        type="button"
        className="announcement-bar__pause"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={paused ? 'Play announcement' : 'Pause announcement'}
        title={paused ? 'Play' : 'Pause'}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
    </div>
  );
}

/**
 * Seamless ticker: two identical copies of the phrase run, each repeated enough
 * times to cover the visible width, shifted by exactly one copy per loop.
 */
function Ticker({ messages, paused }: { messages: string[]; paused: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLSpanElement>(null);
  const [repeat, setRepeat] = useState(1);
  const [duration, setDuration] = useState(30);
  const key = messages.join('\u0000');

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;
    const measure = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (groupWidth <= 0) return;
      const count = Math.max(1, Math.ceil(viewport.clientWidth / groupWidth));
      setRepeat(count);
      setDuration(Math.max((count * groupWidth) / SPEED_PX_PER_SECOND, 10));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [key]);

  const group = (ref?: React.Ref<HTMLSpanElement>) => (
    <span ref={ref} className="announcement-bar__group">
      {messages.map((message, index) => (
        <Fragment key={index}>
          <span className="announcement-bar__message">{message}</span>
          <span className="announcement-bar__sep" aria-hidden="true">
            ✦
          </span>
        </Fragment>
      ))}
    </span>
  );

  return (
    <div ref={viewportRef} className="announcement-bar__viewport">
      {/* Read once by assistive tech; the moving copies are hidden from it. */}
      <span className="announcement-bar__sr">{messages.join('. ')}</span>

      <div
        className={`announcement-bar__track${paused ? ' is-paused' : ''}`}
        style={{ animationDuration: `${duration}s` }}
        aria-hidden="true"
      >
        {[0, 1].map((copy) => (
          <span key={copy} className="announcement-bar__copy">
            {Array.from({ length: repeat }, (_, index) => (
              <Fragment key={index}>{group(copy === 0 && index === 0 ? groupRef : undefined)}</Fragment>
            ))}
          </span>
        ))}
      </div>

      {/* Reduced motion: one static, truncated line instead of the ticker. */}
      <span className="announcement-bar__static" aria-hidden="true">
        {messages.join('  ·  ')}
      </span>
    </div>
  );
}
