/**
 * Speaker lineup for the landing page.
 *
 * Each card leads with the speaker's signed photo (`image_url`); speakers
 * without a photo fall back to a monogram in the event's brand color.
 */

import type { EventSpeaker } from '../../types/config';
import { PublicCard, PublicSection } from './public-event-shell';
import { Reveal } from './reveal';

export function SpeakersSection({
  speakers,
  title,
}: {
  speakers: EventSpeaker[];
  /** Heading override from the page layout. */
  title?: string;
}) {
  if (speakers.length === 0) return null;

  return (
    <PublicSection title={title || 'Speakers'}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {speakers.map((speaker, index) => (
          <Reveal key={speaker.id} delay={(index % 3) * 100}>
            <SpeakerCard speaker={speaker} />
          </Reveal>
        ))}
      </div>
    </PublicSection>
  );
}

function SpeakerCard({ speaker }: { speaker: EventSpeaker }) {
  return (
    <PublicCard className="h-full overflow-hidden p-0">
      {speaker.image_url ? (
        <img
          src={speaker.image_url}
          alt={speaker.name}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover object-top"
        />
      ) : null}
      <div className="p-5">
        <div className="flex items-center gap-3">
          {speaker.image_url ? null : <Avatar name={speaker.name} />}
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
          <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-white/70">
            {speaker.description}
          </p>
        ) : null}

        <SpeakerLinks speaker={speaker} />
      </div>
    </PublicCard>
  );
}

/** Initials-based avatar for speakers without a photo. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{
        backgroundColor: 'var(--event-brand)',
        color: 'var(--event-brand-contrast)',
      }}
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
