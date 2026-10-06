/**
 * Landing sections whose content is stored on the section itself (Pillars,
 * Testimonials, FAQ, Agenda, Gallery, Video, CTA band, Text block).
 *
 * Each renders through the themed primitives (`PublicSection`, `PublicCard`,
 * `--event-*` variables, `dark:` styles) so it adapts to every theme, and
 * renders nothing when its content is empty — a half-filled section in the
 * builder never shows an empty shell on the public page.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Quote, X } from 'lucide-react';

import { cn } from '@core/utils';

import { DISPLAY_FONT_CLASS } from '../../themes/registry';
import type {
  AgendaContent,
  CtaBandContent,
  FaqContent,
  GalleryContent,
  GalleryImage,
  PillarsContent,
  RichTextContent,
  TestimonialsContent,
  VideoContent,
} from '../../types/landing';
import type { PublicEvent } from '../../types/public';
import { resolveVideo, type VideoSource } from '../../utils/public-video';
import { PublicCard, PublicSection } from './public-event-shell';
import { Reveal } from './reveal';
import { RichText } from './rich-text';
import { VideoModal } from './video-modal';

interface SectionProps<C> {
  content: C;
  title?: string;
}

const MUTED = 'text-slate-600 dark:text-white/70';

/** Numbered value cards ("01 Freedom · 02 Security · 03 Peace"). */
export function PillarsSection({
  content,
  title,
}: SectionProps<PillarsContent>) {
  const items = (content.items ?? []).filter((i) => i.title || i.body);
  if (!content.intro && items.length === 0) return null;

  return (
    <PublicSection title={title || 'What We Stand For'}>
      {content.intro ? (
        <RichText
          value={content.intro}
          className={cn('mb-8 max-w-3xl text-base', MUTED)}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <Reveal key={index} delay={(index % 3) * 100} className="h-full">
            <PublicCard className="h-full">
              <div
                className={cn('text-4xl font-semibold', DISPLAY_FONT_CLASS)}
                style={{ color: 'var(--event-brand)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3
                className={cn('mt-3 text-xl font-semibold', DISPLAY_FONT_CLASS)}
              >
                {item.title}
              </h3>
              {item.body ? (
                <p className={cn('mt-2 whitespace-pre-line text-sm', MUTED)}>
                  {item.body}
                </p>
              ) : null}
            </PublicCard>
          </Reveal>
        ))}
      </div>
    </PublicSection>
  );
}

/** Attendee quotes; a testimonial with a video gets a "Watch" lightbox. */
export function TestimonialsSection({
  content,
  title,
}: SectionProps<TestimonialsContent>) {
  const [playing, setPlaying] = useState<VideoSource | null>(null);
  const items = (content.items ?? []).filter((i) => i.quote || i.video_url);
  if (items.length === 0) return null;

  return (
    <PublicSection title={title || 'What Attendees Say'}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const video = resolveVideo(item.video_url, true);
          return (
            <Reveal key={index} delay={(index % 3) * 100} className="h-full">
              <PublicCard className="flex h-full flex-col">
                <Quote
                  className="h-7 w-7"
                  style={{ color: 'var(--event-brand)' }}
                  aria-hidden="true"
                />
                {item.quote ? (
                  <blockquote
                    className={cn(
                      'mt-3 flex-1 whitespace-pre-line text-base leading-relaxed',
                      DISPLAY_FONT_CLASS,
                    )}
                  >
                    {item.quote}
                  </blockquote>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-5 flex items-center gap-3">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt=""
                      loading="lazy"
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {item.name ? (
                      <div className="truncate font-semibold">{item.name}</div>
                    ) : null}
                    {item.subtitle ? (
                      <div className={cn('truncate text-xs', MUTED)}>
                        {item.subtitle}
                      </div>
                    ) : null}
                  </div>
                  {video ? (
                    <button
                      type="button"
                      onClick={() => setPlaying(video)}
                      className="inline-flex shrink-0 items-center gap-1.5 border border-slate-300 px-3 dark:border-white/20 py-1.5 text-xs font-semibold"
                      style={{
                        borderRadius: 'var(--event-btn-radius)',
                        color: 'var(--event-brand)',
                      }}
                    >
                      <Play className="h-3.5 w-3.5" /> Watch
                    </button>
                  ) : null}
                </div>
              </PublicCard>
            </Reveal>
          );
        })}
      </div>
      <VideoModal
        source={playing}
        title="Testimonial video"
        onClose={() => setPlaying(null)}
      />
    </PublicSection>
  );
}

/** Accordion of questions; several may be open at once. */
export function FaqSection({ content, title }: SectionProps<FaqContent>) {
  const items = (content.items ?? []).filter((i) => i.question);
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  if (items.length === 0) return null;

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <PublicSection title={title || 'Frequently Asked Questions'}>
      <PublicCard className="divide-y divide-slate-200 p-0 dark:divide-white/10">
        {items.map((item, index) => {
          const isOpen = open.has(index);
          const panelId = `faq-panel-${index}`;
          return (
            <div key={index}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
              >
                <span>{item.question}</span>
                <Plus
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-45',
                  )}
                  style={{ color: 'var(--event-brand)' }}
                  aria-hidden="true"
                />
              </button>
              {/* grid-rows 0fr→1fr animates height without measuring. */}
              <div
                id={panelId}
                role="region"
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <RichText
                    value={item.answer}
                    className={cn('px-5 pb-5 text-sm', MUTED)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </PublicCard>
    </PublicSection>
  );
}

/** Schedule, with day tabs when the event spans several days. */
export function AgendaSection({ content, title }: SectionProps<AgendaContent>) {
  const days = (content.days ?? []).filter((d) =>
    d.items?.some((i) => i.title),
  );
  const [active, setActive] = useState(0);
  if (days.length === 0) return null;
  const day = days[Math.min(active, days.length - 1)];

  return (
    <PublicSection title={title || 'Agenda'}>
      {days.length > 1 ? (
        <div className="mb-5 flex flex-wrap gap-2" role="tablist">
          {days.map((d, index) => {
            const selected = index === active;
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(index)}
                className={cn(
                  'border px-4 py-2 text-sm font-semibold transition',
                  selected
                    ? 'border-transparent'
                    : 'border-slate-300 dark:border-white/20',
                )}
                style={{
                  borderRadius: 'var(--event-btn-radius)',
                  ...(selected
                    ? {
                        backgroundColor: 'var(--event-brand)',
                        color: 'var(--event-brand-contrast)',
                      }
                    : {}),
                }}
              >
                {d.label || `Day ${index + 1}`}
              </button>
            );
          })}
        </div>
      ) : null}
      <PublicCard
        className="divide-y divide-slate-200 p-0 dark:divide-white/10"
        key={active}
      >
        {day.items
          .filter((i) => i.title)
          .map((item, index) => (
            <div
              key={index}
              className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6"
            >
              <div
                className="text-sm font-semibold tabular-nums"
                style={{ color: 'var(--event-brand)' }}
              >
                {item.time}
              </div>
              <div>
                <div className="font-semibold">{item.title}</div>
                {item.speaker ? (
                  <div className={cn('text-xs', MUTED)}>{item.speaker}</div>
                ) : null}
                {item.description ? (
                  <p className={cn('mt-1 whitespace-pre-line text-sm', MUTED)}>
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
      </PublicCard>
    </PublicSection>
  );
}

/** Image grid with a click-to-enlarge lightbox. */
export function GallerySection({
  content,
  title,
}: SectionProps<GalleryContent>) {
  const images = (content.images ?? []).filter((i) => i.url);
  const [zoomed, setZoomed] = useState<GalleryImage | null>(null);
  if (images.length === 0) return null;

  return (
    <PublicSection title={title || 'Gallery'}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setZoomed(image)}
            className="group relative aspect-square overflow-hidden"
            style={{ borderRadius: 'min(var(--event-btn-radius), 1rem)' }}
            aria-label={image.caption || `Open image ${index + 1}`}
          >
            <img
              src={image.url ?? undefined}
              alt={image.caption}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-105"
            />
            {image.caption ? (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
                {image.caption}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <ImageLightbox image={zoomed} onClose={() => setZoomed(null)} />
    </PublicSection>
  );
}

/** Native-dialog lightbox for one gallery image. */
function ImageLightbox({
  image,
  onClose,
}: {
  image: GalleryImage | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (image && !dialog.open) dialog.showModal();
    if (!image && dialog.open) dialog.close();
  }, [image]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={image?.caption || 'Image'}
      className="max-h-[90vh] w-[min(1100px,calc(100vw-32px))] overflow-visible bg-transparent p-0 backdrop:bg-black/85"
    >
      {image ? (
        <figure className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image"
            className="absolute -top-11 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={image.url ?? undefined}
            alt={image.caption}
            className="max-h-[80vh] w-full rounded-lg object-contain"
          />
          {image.caption ? (
            <figcaption className="mt-2 text-center text-sm text-white/80">
              {image.caption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </dialog>
  );
}

/** One inline video (YouTube/Vimeo embed or a direct file). */
export function VideoSection({ content, title }: SectionProps<VideoContent>) {
  const source = resolveVideo(content.url);
  if (!source) return null;

  return (
    <PublicSection title={title || undefined}>
      <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
        {source.kind === 'embed' ? (
          <iframe
            src={source.src}
            title={content.caption || title || 'Event video'}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <video
            src={source.src}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full"
          />
        )}
      </div>
      {content.caption ? (
        <p className={cn('mt-3 text-center text-sm', MUTED)}>
          {content.caption}
        </p>
      ) : null}
    </PublicSection>
  );
}

/** Closing call to action; blank fields fall back to sensible copy. */
export function CtaBandSection({
  content,
  event,
}: SectionProps<CtaBandContent> & { event: PublicEvent }) {
  const heading = content.heading || `Don't miss ${event.name}`;
  const subtext = content.subtext || '';

  return (
    <PublicSection>
      <div
        className="relative overflow-hidden px-6 py-14 text-center sm:px-12"
        style={{
          borderRadius: 'min(var(--event-btn-radius), 1.5rem)',
          background:
            'linear-gradient(135deg, var(--event-brand), color-mix(in srgb, var(--event-brand) 55%, #000))',
          color: 'var(--event-brand-contrast)',
        }}
      >
        <h2
          className={cn(
            'mx-auto max-w-3xl text-3xl font-semibold sm:text-4xl',
            DISPLAY_FONT_CLASS,
          )}
        >
          {heading}
        </h2>
        {subtext ? (
          <p className="mx-auto mt-3 max-w-2xl text-base opacity-90">
            {subtext}
          </p>
        ) : null}
        {event.sales_state.is_open ? (
          <Link
            to={`/event/${event.shortcut}/checkout`}
            className="mt-8 inline-block bg-white px-7 py-3 text-sm font-semibold text-slate-900 shadow-lg transition motion-safe:hover:-translate-y-px"
            style={{ borderRadius: 'var(--event-btn-radius)' }}
          >
            {content.button_label || 'Get your ticket'}
          </Link>
        ) : null}
      </div>
    </PublicSection>
  );
}

/** Free-form rich text. */
export function RichTextSection({
  content,
  title,
}: SectionProps<RichTextContent>) {
  if (!content.body) return null;
  return (
    <PublicSection title={title || undefined}>
      <PublicCard>
        <RichText value={content.body} className={cn('text-base', MUTED)} />
      </PublicCard>
    </PublicSection>
  );
}
