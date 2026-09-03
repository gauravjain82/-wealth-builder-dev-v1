/**
 * Speaker lineup for the landing page.
 *
 * Speaker images live in `image_blob_name` and the public serializer does not
 * yet sign them (the upload endpoint only handles the event's own blob fields —
 * see the Phase 1c note about config-model images). Until per-model upload
 * endpoints exist, each speaker falls back to a monogram avatar.
 */

import type { EventSpeaker } from '../../types/config';
import { PublicCard, PublicSection } from './public-event-shell';

export function SpeakersSection({ speakers }: { speakers: EventSpeaker[] }) {
  if (speakers.length === 0) return null;

  return (
    <PublicSection title="Speakers">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {speakers.map((speaker) => (
          <SpeakerCard key={speaker.id} speaker={speaker} />
        ))}
      </div>
    </PublicSection>
  );
}

function SpeakerCard({ speaker }: { speaker: EventSpeaker }) {
  return (
    <PublicCard>
      <div className="flex items-center gap-3">
        <Avatar name={speaker.name} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{speaker.name}</div>
          {speaker.title ? (
            <div className="truncate text-xs text-slate-600 dark:text-white/60">
              {speaker.title}
            </div>
          ) : null}
        </div>
      </div>

      {speaker.description ? (
        <p className="mt-3 text-sm text-slate-700 dark:text-white/70">
          {speaker.description}
        </p>
      ) : null}

      <SpeakerLinks speaker={speaker} />
    </PublicCard>
  );
}

/** Initials-based avatar stand-in while speaker images aren't served publicly. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-slate-950"
      style={{ backgroundColor: 'var(--event-brand)' }}
      aria-hidden="true"
    >
      {initials || '?'}
    </div>
  );
}

function SpeakerLinks({ speaker }: { speaker: EventSpeaker }) {
  const links = [
    { label: 'Website', href: speaker.website },
    { label: 'Instagram', href: speaker.instagram },
    { label: 'X', href: speaker.twitter },
  ].filter((link) => Boolean(link.href));

  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
          style={{ color: 'var(--event-brand)' }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
