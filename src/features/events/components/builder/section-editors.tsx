import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { Button, Checkbox, Input, Label, Select, Text, Textarea } from '@shared/components';
import { configService } from '../../services/config-service';
import { sessionService } from '../../services/session-service';
import type { EventSession } from '../../types/session';
import type {
  AgendaContent,
  AgendaItem,
  AgendaSource,
  CtaBandContent,
  CtaBandSize,
  FaqContent,
  GalleryContent,
  MarqueeContent,
  PillarsContent,
  PricingContent,
  RichTextContent,
  SectionType,
  StatItem,
  StatSource,
  StatsContent,
  TaglineContent,
  TestimonialItem,
  TestimonialsContent,
  VideoContent,
} from '../../types/landing';
import { RichTextEditor } from './rich-text-editor';

interface EditorProps<C> {
  content: C;
  onChange: (content: C) => void;
  eventId: number;
}

/**
 * Content editor for one landing section, chosen by type (Strategy). Each
 * editor is controlled: it receives the section's content and emits a full
 * replacement on every change; the Page tab owns saving.
 */
export function SectionContentEditor({
  type,
  content,
  onChange,
  eventId,
}: {
  type: SectionType;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  eventId: number;
}) {
  // Each editor's content type is guaranteed by `type`; the casts bridge the
  // untyped JSON the API returns.
  const props = { content: content as never, onChange: onChange as never, eventId };
  switch (type) {
    case 'pillars':
      return <PillarsEditor {...props} />;
    case 'testimonials':
      return <TestimonialsEditor {...props} />;
    case 'faq':
      return <FaqEditor {...props} />;
    case 'agenda':
      return <AgendaEditor {...props} />;
    case 'gallery':
      return <GalleryEditor {...props} />;
    case 'video':
      return <VideoEditor {...props} />;
    case 'cta_band':
      return <CtaBandEditor {...props} />;
    case 'rich_text':
      return <RichTextBlockEditor {...props} />;
    case 'tagline':
      return <TaglineEditor {...props} />;
    case 'stats':
      return <StatsEditor {...props} />;
    case 'marquee':
      return <MarqueeEditor {...props} />;
    case 'pricing':
      return <PricingContentEditor {...props} />;
    default:
      return null;
  }
}

// --- shared pieces ---------------------------------------------------------------

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label variant="form">{label}</Label>
      {children}
      {help && (
        <Text variant="muted" className="text-xs">
          {help}
        </Text>
      )}
    </div>
  );
}

/** Replace the item at `index`, returning a new array. */
function replaceAt<T>(items: T[], index: number, next: T): T[] {
  return items.map((item, i) => (i === index ? next : item));
}

/** Move the item at `index` by `delta` (±1), returning a new array. */
function move<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Editable, reorderable list of sub-items (FAQ entries, pillars, …). */
function ItemList<T>({
  items,
  onChange,
  newItem,
  max,
  noun,
  renderItem,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
  max: number;
  noun: string;
  renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-md border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
              {noun} {index + 1}
            </span>
            <span className="flex gap-1">
              <IconButton
                label="Move up"
                disabled={index === 0}
                onClick={() => onChange(move(items, index, -1))}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                label="Move down"
                disabled={index === items.length - 1}
                onClick={() => onChange(move(items, index, 1))}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                label={`Remove ${noun}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </span>
          </div>
          {renderItem(item, (next) => onChange(replaceAt(items, index, next)), index)}
        </div>
      ))}
      {items.length < max ? (
        <Button type="button" variant="secondary" onClick={() => onChange([...items, newItem()])}>
          Add {noun.toLowerCase()}
        </Button>
      ) : (
        <Text variant="muted" className="text-xs">
          Maximum of {max} reached.
        </Text>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:text-white/60 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

/** A short list of single-line strings (hook lines, words, inclusions…). */
function StringList({
  items,
  onChange,
  max,
  maxLength,
  noun,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  max: number;
  maxLength: number;
  noun: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <Input
            value={item}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={`${noun} ${index + 1}`}
            onChange={(e) => onChange(replaceAt(items, index, e.target.value))}
          />
          <IconButton
            label="Move up"
            disabled={index === 0}
            onClick={() => onChange(move(items, index, -1))}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Move down"
            disabled={index === items.length - 1}
            onClick={() => onChange(move(items, index, 1))}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={`Remove ${noun.toLowerCase()}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ))}
      {items.length < max ? (
        <Button type="button" variant="secondary" onClick={() => onChange([...items, ''])}>
          Add {noun.toLowerCase()}
        </Button>
      ) : (
        <Text variant="muted" className="text-xs">
          Maximum of {max} reached.
        </Text>
      )}
    </div>
  );
}

/** Upload button that stores an image and reports its blob + preview URL. */
function ImagePickButton({
  eventId,
  label,
  multiple = false,
  onUploaded,
}: {
  eventId: number;
  label: string;
  multiple?: boolean;
  onUploaded: (uploads: { blob: string; url: string | null }[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploads = [];
      for (const file of Array.from(files)) {
        const res = await configService.uploadLandingImage(eventId, file);
        uploads.push({ blob: res.blob_name, url: res.url });
      }
      onUploaded(uploads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <ImagePlus className="mr-1.5 h-4 w-4" />
        {busy ? 'Uploading…' : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
      />
    </span>
  );
}

// --- editors ----------------------------------------------------------------------

function PillarsEditor({ content, onChange }: EditorProps<PillarsContent>) {
  return (
    <div className="space-y-4">
      <Field label="Intro">
        <RichTextEditor
          value={content.intro ?? ''}
          onChange={(intro) => onChange({ ...content, intro })}
          placeholder="Freedom. Security. Peace. Not someday goals — a way of life."
        />
      </Field>
      <ItemList
        items={content.items ?? []}
        onChange={(items) => onChange({ ...content, items })}
        newItem={() => ({ title: '', body: '' })}
        max={6}
        noun="Pillar"
        renderItem={(item, update) => (
          <div className="grid gap-3">
            <Input
              value={item.title}
              placeholder="Freedom"
              onChange={(e) => update({ ...item, title: e.target.value })}
            />
            <Textarea
              rows={2}
              value={item.body}
              placeholder="One or two sentences."
              onChange={(e) => update({ ...item, body: e.target.value })}
            />
          </div>
        )}
      />
    </div>
  );
}

function TestimonialsEditor({ content, onChange, eventId }: EditorProps<TestimonialsContent>) {
  const blank = (): TestimonialItem => ({
    quote: '',
    name: '',
    subtitle: '',
    photo_blob: '',
    video_url: '',
  });
  return (
    <ItemList
      items={content.items ?? []}
      onChange={(items) => onChange({ ...content, items })}
      newItem={blank}
      max={12}
      noun="Testimonial"
      renderItem={(item, update) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Textarea
              rows={3}
              value={item.quote}
              placeholder="What did they say?"
              onChange={(e) => update({ ...item, quote: e.target.value })}
            />
          </div>
          <Input
            value={item.name}
            placeholder="Name"
            onChange={(e) => update({ ...item, name: e.target.value })}
          />
          <Input
            value={item.subtitle}
            placeholder="e.g. Attended 2026"
            onChange={(e) => update({ ...item, subtitle: e.target.value })}
          />
          <Input
            value={item.video_url}
            placeholder="Video link (optional) — YouTube, Vimeo or MP4"
            onChange={(e) => update({ ...item, video_url: e.target.value })}
            className="sm:col-span-2"
          />
          <div className="flex items-center gap-3 sm:col-span-2">
            {item.photo_url ? (
              <img src={item.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : null}
            <ImagePickButton
              eventId={eventId}
              label={item.photo_blob ? 'Replace photo' : 'Add photo'}
              onUploaded={([u]) => update({ ...item, photo_blob: u.blob, photo_url: u.url })}
            />
            {item.photo_blob ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => update({ ...item, photo_blob: '', photo_url: null })}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}

function FaqEditor({ content, onChange }: EditorProps<FaqContent>) {
  return (
    <ItemList
      items={content.items ?? []}
      onChange={(items) => onChange({ ...content, items })}
      newItem={() => ({ question: '', answer: '' })}
      max={30}
      noun="Question"
      renderItem={(item, update) => (
        <div className="grid gap-3">
          <Input
            value={item.question}
            placeholder="What does my ticket include?"
            onChange={(e) => update({ ...item, question: e.target.value })}
          />
          <RichTextEditor
            value={item.answer}
            onChange={(answer) => update({ ...item, answer })}
            placeholder="Answer…"
            minHeightClass="min-h-[80px]"
          />
        </div>
      )}
    />
  );
}

const AGENDA_SOURCES: Array<{ value: AgendaSource; label: string; hint: string }> = [
  { value: 'manual', label: 'Write it here', hint: 'Type the schedule by hand.' },
  {
    value: 'sessions',
    label: 'Show sessions',
    hint: 'List the sessions marked “Show on public agenda”.',
  },
];

function AgendaEditor({ content, onChange, eventId }: EditorProps<AgendaContent>) {
  const source: AgendaSource = content.source ?? 'manual';
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-900 dark:text-white">
          What should this agenda show?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AGENDA_SOURCES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                source === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-white/15'
              }`}
            >
              <input
                type="radio"
                name={`agenda-source-${eventId}`}
                value={option.value}
                checked={source === option.value}
                onChange={() => onChange({ ...content, source: option.value })}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">
                  {option.label}
                </span>
                <span className="block text-xs text-slate-500 dark:text-white/50">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {source === 'sessions' ? (
        <SessionAgendaPreview eventId={eventId} hasManualDays={(content.days ?? []).length > 0} />
      ) : (
        <ManualAgendaEditor content={content} onChange={onChange} />
      )}
    </div>
  );
}

/** What the public agenda will list when it shows sessions. */
function SessionAgendaPreview({ eventId, hasManualDays }: { eventId: number; hasManualDays: boolean }) {
  const [sessions, setSessions] = useState<EventSession[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    sessionService
      .list(eventId)
      .then((rows) => !cancelled && setSessions(rows.filter((s) => s.is_active && s.show_on_agenda)))
      .catch(() => !cancelled && setSessions([]));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/5">
      {sessions === null ? (
        <Text variant="muted" className="text-sm">Loading sessions…</Text>
      ) : sessions.length === 0 ? (
        <Text className="text-sm text-amber-700 dark:text-amber-300">
          No sessions are marked “Show on public agenda” yet, so this section will be hidden. Add or
          edit them in the builder’s Sessions tab.
        </Text>
      ) : (
        <>
          <p className="text-slate-800 dark:text-white/90">
            <strong>{sessions.length}</strong> session{sessions.length === 1 ? '' : 's'} will be
            listed, grouped by day, in the event’s timezone.
          </p>
          <ul className="list-inside list-disc text-xs text-slate-600 dark:text-white/60">
            {sessions.slice(0, 6).map((s) => (
              <li key={s.id}>{s.title}</li>
            ))}
            {sessions.length > 6 ? <li>…and {sessions.length - 6} more</li> : null}
          </ul>
          <Text variant="muted" className="text-xs">
            Choose which ones appear with “Show on public agenda” in the Sessions tab.
          </Text>
        </>
      )}
      {hasManualDays ? (
        <Text variant="muted" className="text-xs">
          Your hand-written agenda is kept — switch back to “Write it here” to use it again.
        </Text>
      ) : null}
    </div>
  );
}

function ManualAgendaEditor({
  content,
  onChange,
}: {
  content: AgendaContent;
  onChange: (next: AgendaContent) => void;
}) {
  const blankItem = (): AgendaItem => ({ time: '', title: '', description: '', speaker: '' });
  const days = content.days ?? [];
  return (
    <ItemList
      items={days}
      onChange={(next) => onChange({ ...content, days: next })}
      newItem={() => ({ label: `Day ${days.length + 1}`, items: [blankItem()] })}
      max={7}
      noun="Day"
      renderItem={(day, updateDay) => (
        <div className="space-y-3">
          <Input
            value={day.label}
            placeholder="Thursday, Jan 21"
            onChange={(e) => updateDay({ ...day, label: e.target.value })}
          />
          <ItemList
            items={day.items ?? []}
            onChange={(items) => updateDay({ ...day, items })}
            newItem={blankItem}
            max={40}
            noun="Slot"
            renderItem={(item, update) => (
              <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                <Input
                  value={item.time}
                  placeholder="9:00 AM"
                  onChange={(e) => update({ ...item, time: e.target.value })}
                />
                <Input
                  value={item.title}
                  placeholder="Session title"
                  onChange={(e) => update({ ...item, title: e.target.value })}
                />
                <Input
                  value={item.speaker}
                  placeholder="Speaker (optional)"
                  onChange={(e) => update({ ...item, speaker: e.target.value })}
                  className="sm:col-start-2"
                />
                <Textarea
                  rows={2}
                  value={item.description}
                  placeholder="Description (optional)"
                  onChange={(e) => update({ ...item, description: e.target.value })}
                  className="sm:col-start-2"
                />
              </div>
            )}
          />
        </div>
      )}
    />
  );
}

function GalleryEditor({ content, onChange, eventId }: EditorProps<GalleryContent>) {
  const images = content.images ?? [];
  const max = 24;
  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={`${image.blob}-${index}`} className="space-y-1.5">
              <div className="group relative aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-white/5">
                {image.url ? (
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute right-1 top-1 flex gap-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <IconButton
                    label="Move left"
                    disabled={index === 0}
                    onClick={() => onChange({ images: move(images, index, -1) })}
                  >
                    <ArrowUp className="h-3.5 w-3.5 -rotate-90 text-white" />
                  </IconButton>
                  <IconButton
                    label="Move right"
                    disabled={index === images.length - 1}
                    onClick={() => onChange({ images: move(images, index, 1) })}
                  >
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90 text-white" />
                  </IconButton>
                  <IconButton
                    label="Remove image"
                    onClick={() => onChange({ images: images.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  </IconButton>
                </div>
              </div>
              <Input
                value={image.caption}
                placeholder="Caption (optional)"
                onChange={(e) =>
                  onChange({
                    images: replaceAt(images, index, { ...image, caption: e.target.value }),
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
      {images.length < max ? (
        <ImagePickButton
          eventId={eventId}
          label="Upload photos"
          multiple
          onUploaded={(uploads) =>
            onChange({
              images: [
                ...images,
                ...uploads.map((u) => ({ blob: u.blob, url: u.url, caption: '' })),
              ].slice(0, max),
            })
          }
        />
      ) : (
        <Text variant="muted" className="text-xs">
          Maximum of {max} images reached.
        </Text>
      )}
    </div>
  );
}

function VideoEditor({ content, onChange }: EditorProps<VideoContent>) {
  return (
    <div className="grid gap-3">
      <Field label="Video link" help="YouTube, Vimeo, or a direct .mp4/.webm link.">
        <Input
          value={content.url ?? ''}
          placeholder="https://youtube.com/watch?v=…"
          onChange={(e) => onChange({ ...content, url: e.target.value })}
        />
      </Field>
      <Field label="Caption">
        <Input
          value={content.caption ?? ''}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
        />
      </Field>
    </div>
  );
}

const CTA_SIZES: Array<{ value: CtaBandSize; label: string }> = [
  { value: 'banner', label: 'Banner — a compact strip' },
  { value: 'final', label: 'Closing section — full height, large heading' },
];

function CtaBandEditor({ content, onChange }: EditorProps<CtaBandContent>) {
  const size: CtaBandSize = content.size ?? 'banner';
  return (
    <div className="grid gap-3">
      <Field label="Size">
        <Select
          value={size}
          onChange={(e) => onChange({ ...content, size: e.target.value as CtaBandSize })}
        >
          {CTA_SIZES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Heading" help={'Blank shows "Don\'t miss <event name>".'}>
        <Input
          value={content.heading ?? ''}
          placeholder={
            size === 'final' ? 'Stop watching from the sidelines.' : 'Your next chapter starts in January'
          }
          onChange={(e) => onChange({ ...content, heading: e.target.value })}
        />
      </Field>
      <Field label="Supporting text">
        <Input
          value={content.subtext ?? ''}
          onChange={(e) => onChange({ ...content, subtext: e.target.value })}
        />
      </Field>
      {size === 'final' ? (
        <>
          <Field label="Paragraphs" help="Shown under the heading, one per line, up to six.">
            <StringList
              items={content.body ?? []}
              onChange={(body) => onChange({ ...content, body })}
              max={6}
              maxLength={300}
              noun="Paragraph"
              placeholder="The only question left is whether you show up."
            />
          </Field>
          <Field
            label="Highlight"
            help="A word or phrase from the paragraphs to show in the accent colour."
          >
            <Input
              value={content.highlight ?? ''}
              maxLength={60}
              placeholder="become"
              onChange={(e) => onChange({ ...content, highlight: e.target.value })}
            />
          </Field>
        </>
      ) : null}
      <Field
        label="Button label"
        help="The button opens checkout and only shows while sales are open."
      >
        <Input
          value={content.button_label ?? ''}
          placeholder="Get your ticket"
          onChange={(e) => onChange({ ...content, button_label: e.target.value })}
        />
      </Field>
      {size === 'final' ? (
        <Field label="Sign-off" help="A closing line under the button.">
          <Input
            value={content.signoff ?? ''}
            maxLength={160}
            placeholder="See you in the room, champion."
            onChange={(e) => onChange({ ...content, signoff: e.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}

function TaglineEditor({ content, onChange }: EditorProps<TaglineContent>) {
  const links = content.links ?? [];
  return (
    <div className="space-y-4">
      <Field label="Hook lines" help="One to four short lines, centred under the hero.">
        <StringList
          items={content.lines ?? []}
          onChange={(lines) => onChange({ ...content, lines })}
          max={4}
          maxLength={200}
          noun="Line"
          placeholder="Learn the business. Rebuild your mind."
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-white/90">
        <Checkbox
          checked={Boolean(content.highlight_last)}
          onChange={(e) => onChange({ ...content, highlight_last: e.target.checked })}
        />
        Show the last line in the accent colour
      </label>
      <Field
        label="Highlight words"
        help="Up to eight short words shown large; the highlight moves from word to word (it stays still for visitors who prefer reduced motion)."
      >
        <StringList
          items={content.words ?? []}
          onChange={(words) => onChange({ ...content, words })}
          max={8}
          maxLength={24}
          noun="Word"
          placeholder="CONNECT"
        />
      </Field>
      <Field
        label="Extra links"
        help="Up to two outline buttons beside the ticket button. Use a full https:// link, or #anchor for a spot on this page."
      >
        <ItemList
          items={links}
          onChange={(next) => onChange({ ...content, links: next })}
          newItem={() => ({ label: '', url: '' })}
          max={2}
          noun="Link"
          renderItem={(link, update) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={link.label}
                maxLength={40}
                placeholder="See what happens"
                onChange={(e) => update({ ...link, label: e.target.value })}
              />
              <Input
                value={link.url}
                maxLength={500}
                placeholder="https://… or #agenda"
                onChange={(e) => update({ ...link, url: e.target.value })}
              />
            </div>
          )}
        />
      </Field>
      <Field
        label="Button label"
        help="The ticket button's text. Leave blank for the theme default (Claim your seat, or Get your ticket)."
      >
        <Input
          value={content.button_label ?? ''}
          maxLength={40}
          placeholder="Claim your seat"
          onChange={(e) => onChange({ ...content, button_label: e.target.value })}
        />
      </Field>
    </div>
  );
}

const STAT_SOURCES: Array<{ value: StatSource; label: string }> = [
  { value: 'static', label: 'Typed value' },
  { value: 'tickets_remaining', label: 'Live: tickets remaining' },
  { value: 'tickets_sold', label: 'Live: tickets sold' },
];

function StatsEditor({ content, onChange }: EditorProps<StatsContent>) {
  const blank = (): StatItem => ({ value: '', label: '', source: 'static' });
  return (
    <div className="space-y-2">
      <ItemList
        items={content.items ?? []}
        onChange={(items) => onChange({ ...content, items })}
        newItem={blank}
        max={4}
        noun="Stat"
        renderItem={(item, update) => {
          const live = item.source !== 'static';
          return (
            <div className="grid gap-3 sm:grid-cols-[12rem_8rem_1fr]">
              <Select
                value={item.source}
                aria-label="Value source"
                onChange={(e) => update({ ...item, source: e.target.value as StatSource })}
              >
                {STAT_SOURCES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Input
                value={live ? '' : item.value}
                disabled={live}
                maxLength={24}
                aria-label="Value"
                placeholder={live ? 'Live' : '$5,000+'}
                onChange={(e) => update({ ...item, value: e.target.value })}
              />
              <Input
                value={item.label}
                maxLength={80}
                aria-label="Label"
                placeholder="What this costs anywhere else"
                onChange={(e) => update({ ...item, label: e.target.value })}
              />
              {live ? (
                <Text variant="muted" className="text-xs sm:col-span-3">
                  Shown live from ticket sales; hidden if unavailable
                  {item.source === 'tickets_remaining'
                    ? ' (for example when the event has no ticket cap).'
                    : '.'}
                  {item.source === 'tickets_sold'
                    ? ' Adding this publishes your sold-ticket count on the public page.'
                    : ''}
                </Text>
              ) : null}
            </div>
          );
        }}
      />
      <Text variant="muted" className="text-xs">
        Keep at least one stat; remove the section to hide it entirely.
      </Text>
    </div>
  );
}

function MarqueeEditor({ content, onChange, eventId }: EditorProps<MarqueeContent>) {
  const items = content.items ?? [];
  const max = 40;
  const setItems = (next: MarqueeContent['items']) => onChange({ ...content, items: next });
  return (
    <div className="space-y-4">
      <Field label="Intro" help="One line above the strip.">
        <Input
          value={content.intro ?? ''}
          maxLength={200}
          placeholder="Past stages have featured some of the greatest minds in business."
          onChange={(e) => onChange({ ...content, intro: e.target.value })}
        />
      </Field>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item, index) => (
            <div key={`${item.photo_blob}-${index}`} className="space-y-1.5">
              <div className="group relative aspect-[4/5] overflow-hidden rounded-md bg-slate-100 dark:bg-white/5">
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute right-1 top-1 flex gap-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <IconButton
                    label="Move left"
                    disabled={index === 0}
                    onClick={() => setItems(move(items, index, -1))}
                  >
                    <ArrowUp className="h-3.5 w-3.5 -rotate-90 text-white" />
                  </IconButton>
                  <IconButton
                    label="Move right"
                    disabled={index === items.length - 1}
                    onClick={() => setItems(move(items, index, 1))}
                  >
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90 text-white" />
                  </IconButton>
                  <IconButton
                    label="Remove photo"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  </IconButton>
                </div>
              </div>
              <Input
                value={item.name}
                maxLength={120}
                placeholder="Name"
                onChange={(e) => setItems(replaceAt(items, index, { ...item, name: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}
      {items.length < max ? (
        <ImagePickButton
          eventId={eventId}
          label="Upload photos"
          multiple
          onUploaded={(uploads) =>
            setItems(
              [
                ...items,
                ...uploads.map((u) => ({ name: '', photo_blob: u.blob, photo_url: u.url })),
              ].slice(0, max),
            )
          }
        />
      ) : (
        <Text variant="muted" className="text-xs">
          Maximum of {max} photos reached.
        </Text>
      )}
      <Text variant="muted" className="text-xs">
        The strip scrolls slowly and pauses on hover; visitors who prefer reduced motion see a
        still grid. With no photos the section is hidden.
      </Text>
    </div>
  );
}

/** Optional value copy for the model-backed Ticket prices section. */
function PricingContentEditor({ content, onChange }: EditorProps<PricingContent>) {
  return (
    <div className="grid gap-3">
      <Text variant="muted" className="text-xs">
        Optional. Fill the anchor, inclusions, motto or fine print to show the current price as a
        single ticket card; the eyebrow and button label only relabel that card. The price itself
        always comes from the Ticket Price tab.
      </Text>
      <Field label="Eyebrow" help="Small label above the card.">
        <Input
          value={content.eyebrow ?? ''}
          maxLength={60}
          placeholder="Your ticket"
          onChange={(e) => onChange({ ...content, eyebrow: e.target.value })}
        />
      </Field>
      <Field label="Anchor line">
        <Input
          value={content.anchor_text ?? ''}
          maxLength={200}
          placeholder="Seeing our keynote speakers live anywhere else runs"
          onChange={(e) => onChange({ ...content, anchor_text: e.target.value })}
        />
      </Field>
      <Field label="Comparison price" help="Shown struck through. Free text, e.g. $5,000+.">
        <Input
          value={content.anchor_price ?? ''}
          maxLength={24}
          placeholder="$5,000+"
          onChange={(e) => onChange({ ...content, anchor_price: e.target.value })}
        />
      </Field>
      <Field label="What's included" help="Up to eight lines, each with a check mark.">
        <StringList
          items={content.inclusions ?? []}
          onChange={(inclusions) => onChange({ ...content, inclusions })}
          max={8}
          maxLength={160}
          noun="Inclusion"
          placeholder="Every session, every stage — all three days"
        />
      </Field>
      <Field
        label="Button label"
        help="Leave blank for the theme default (Claim your seat, or Get your ticket)."
      >
        <Input
          value={content.button_label ?? ''}
          maxLength={40}
          placeholder="Claim your seat"
          onChange={(e) => onChange({ ...content, button_label: e.target.value })}
        />
      </Field>
      <Field label="Motto" help="A bold line under the button.">
        <Input
          value={content.motto ?? ''}
          maxLength={200}
          onChange={(e) => onChange({ ...content, motto: e.target.value })}
        />
      </Field>
      <Field label="Fine print">
        <Textarea
          rows={3}
          value={content.fine_print ?? ''}
          maxLength={1000}
          onChange={(e) => onChange({ ...content, fine_print: e.target.value })}
        />
      </Field>
    </div>
  );
}

function RichTextBlockEditor({ content, onChange }: EditorProps<RichTextContent>) {
  return (
    <RichTextEditor
      value={content.body ?? ''}
      onChange={(body) => onChange({ ...content, body })}
      placeholder="Write anything…"
      minHeightClass="min-h-[140px]"
    />
  );
}
