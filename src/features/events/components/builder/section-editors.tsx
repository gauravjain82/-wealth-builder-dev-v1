import { useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { Button, Input, Label, Text, Textarea } from '@shared/components';
import { configService } from '../../services/config-service';
import type {
  AgendaContent,
  AgendaItem,
  CtaBandContent,
  FaqContent,
  GalleryContent,
  PillarsContent,
  RichTextContent,
  SectionType,
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

function AgendaEditor({ content, onChange }: EditorProps<AgendaContent>) {
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

function CtaBandEditor({ content, onChange }: EditorProps<CtaBandContent>) {
  return (
    <div className="grid gap-3">
      <Field label="Heading" help={'Blank shows "Don\'t miss <event name>".'}>
        <Input
          value={content.heading ?? ''}
          placeholder="Your next chapter starts in January"
          onChange={(e) => onChange({ ...content, heading: e.target.value })}
        />
      </Field>
      <Field label="Supporting text">
        <Input
          value={content.subtext ?? ''}
          onChange={(e) => onChange({ ...content, subtext: e.target.value })}
        />
      </Field>
      <Field
        label="Button label"
        help="The button links to checkout and only shows while sales are open."
      >
        <Input
          value={content.button_label ?? ''}
          placeholder="Get your ticket"
          onChange={(e) => onChange({ ...content, button_label: e.target.value })}
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
