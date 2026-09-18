import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label } from '@/shared/components';
import { StagedFilePicker } from '@/features/admin/content-pages/components/staged-file-picker';
import { useToastStore } from '@/store';
import {
  fetchHomepageContent,
  saveHomepageContent,
  uploadHomepageMedia,
} from '@/features/home/services/home-content-service';
import { isDirectVideoUrl } from '@/features/home/utils/media';
import type { HomepageContent, HomepageVideoSlot } from '@/features/home/types';
import {
  IconVideo,
  IconLink,
  IconPhoto,
  IconCalendarEvent,
  IconAward,
  IconDeviceFloppy,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconUpload,
  IconCheck,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = 'hero' | 'events' | 'recognition' | 'background';

interface SectionDef {
  id: SectionId;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  fields: FieldDef[];
}

interface FieldDef {
  key: keyof HomepageContent;
  label: string;
  hint: string;
  type: 'text' | 'url' | 'video-url' | 'image-url';
  slot?: HomepageVideoSlot;
  accept?: string;
}

// ─── Section definitions ───────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  {
    id: 'hero',
    title: 'Hero Section',
    description: 'The full-width video banner at the top of the homepage.',
    icon: <IconVideo size={20} />,
    accentColor: '#f59e0b',
    fields: [
      {
        key: 'heroTitle',
        label: 'Hero title',
        hint: 'Displayed prominently next to the Register button on the trailer.',
        type: 'text',
      },
      {
        key: 'registerUrl',
        label: 'Register link',
        hint: 'External URL for the event registration button.',
        type: 'url',
      },
      {
        key: 'trailerVideoUrl',
        label: 'Trailer video',
        hint: 'Direct MP4 URL or paste a video link. Upload a new file to replace it.',
        type: 'video-url',
        slot: 'trailer',
        accept: 'video/mp4,video/webm,video/quicktime',
      },
    ],
  },
  {
    id: 'events',
    title: 'Events & Contests Card',
    description: 'Left card on the homepage — embed a Canva presentation or upload a video.',
    icon: <IconCalendarEvent size={20} />,
    accentColor: '#3b82f6',
    fields: [
      {
        key: 'eventsTitle',
        label: 'Card title',
        hint: 'Heading shown on the Events card.',
        type: 'text',
      },
      {
        key: 'eventsVideoUrl',
        label: 'Video / embed URL',
        hint: 'Paste a Canva embed URL (design/…/view?embed) or a direct MP4 link.',
        type: 'video-url',
        slot: 'events',
        accept: 'video/mp4,video/webm,video/quicktime',
      },
    ],
  },
  {
    id: 'recognition',
    title: 'Recognition Card',
    description: 'Right card on the homepage — recognition video or presentation.',
    icon: <IconAward size={20} />,
    accentColor: '#8b5cf6',
    fields: [
      {
        key: 'recognitionTitle',
        label: 'Card title',
        hint: 'Heading shown on the Recognition card.',
        type: 'text',
      },
      {
        key: 'recognitionVideoUrl',
        label: 'Video / embed URL',
        hint: 'Paste a Canva embed URL or a direct MP4 link.',
        type: 'video-url',
        slot: 'recognition',
        accept: 'video/mp4,video/webm,video/quicktime',
      },
    ],
  },
  {
    id: 'background',
    title: 'Background Image',
    description: 'Full-page background image behind the homepage content.',
    icon: <IconPhoto size={20} />,
    accentColor: '#10b981',
    fields: [
      {
        key: 'backgroundImageUrl',
        label: 'Image URL',
        hint: 'Full-resolution image URL or upload a new image to replace.',
        type: 'image-url',
        slot: 'background',
        accept: 'image/*',
      },
    ],
  },
];

// ─── Media Preview ─────────────────────────────────────────────────────────────

function MediaPreview({
  url,
  type,
  stagedFile,
}: {
  url: string;
  type: 'video-url' | 'image-url' | 'text' | 'url';
  stagedFile?: File | null;
}) {
  const objectUrl = useRef<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>('');

  useEffect(() => {
    if (stagedFile) {
      const blob = URL.createObjectURL(stagedFile);
      objectUrl.current = blob;
      setPreviewSrc(blob);
      return () => {
        URL.revokeObjectURL(blob);
        objectUrl.current = null;
      };
    } else {
      setPreviewSrc(url);
    }
  }, [stagedFile, url]);

  if (!previewSrc || (type !== 'video-url' && type !== 'image-url')) return null;

  if (type === 'image-url') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <img
          src={previewSrc}
          alt="Background preview"
          className="h-40 w-full object-cover transition-opacity duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {stagedFile && (
          <span className="absolute right-2 top-2 rounded-md bg-amber-500/90 px-2 py-0.5 text-xs font-semibold text-black">
            Staged
          </span>
        )}
      </div>
    );
  }

  // video-url
  const isDirect = isDirectVideoUrl(previewSrc) || Boolean(stagedFile);
  if (isDirect) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          key={previewSrc}
          src={previewSrc}
          className="h-44 w-full object-cover"
          controls
          playsInline
          muted
        />
        {stagedFile && (
          <span className="absolute right-2 top-2 rounded-md bg-amber-500/90 px-2 py-0.5 text-xs font-semibold text-black">
            Staged — not yet saved
          </span>
        )}
      </div>
    );
  }

  // Canva / embed iframe
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black" style={{ paddingTop: '56.25%' }}>
      <iframe
        key={previewSrc}
        src={previewSrc}
        title="Embed preview"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

// ─── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  stagedFile,
  saving,
  onChange,
  onFileChange,
}: {
  field: FieldDef;
  value: string;
  stagedFile: File | null;
  saving: boolean;
  onChange: (key: keyof HomepageContent, value: string) => void;
  onFileChange: (slot: HomepageVideoSlot, file: File | null) => void;
}) {
  const showMedia = field.type === 'video-url' || field.type === 'image-url';

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex flex-col gap-1">
        <Label variant="form" className="text-white/90 font-medium">
          {field.label}
        </Label>
        <p className="text-xs text-white/40">{field.hint}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* URL / Text input */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-white/30">
              {field.type === 'text' ? null : <IconLink size={14} />}
            </span>
            <Input
              variant="surface"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={
                field.type === 'text'
                  ? 'Enter text…'
                  : field.type === 'url'
                    ? 'https://…'
                    : 'Paste URL or upload below'
              }
              className={field.type !== 'text' ? 'pl-8' : ''}
            />
          </div>

          {/* File picker for media slots */}
          {field.slot && (
            <StagedFilePicker
              label={stagedFile ? `Staged: ${stagedFile.name}` : 'Upload new file'}
              accept={field.accept}
              file={stagedFile}
              existingName={value ? 'Current URL set' : undefined}
              onFileChange={(file) => onFileChange(field.slot!, file)}
              disabled={saving}
            />
          )}
        </div>

        {/* Preview */}
        {showMedia && (
          <MediaPreview url={value} type={field.type} stagedFile={stagedFile} />
        )}
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  draft,
  files,
  saving,
  collapsed,
  onToggleCollapse,
  onFieldChange,
  onFileChange,
}: {
  section: SectionDef;
  draft: HomepageContent;
  files: Partial<Record<HomepageVideoSlot, File | null>>;
  saving: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onFieldChange: (key: keyof HomepageContent, value: string) => void;
  onFileChange: (slot: HomepageVideoSlot, file: File | null) => void;
}) {
  // Count staged files for this section
  const stagedCount = section.fields.filter(
    (f) => f.slot && files[f.slot]
  ).length;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1d25] shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      style={{ borderLeftWidth: '3px', borderLeftColor: section.accentColor }}
    >
      {/* Section header */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-white/[0.03]"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${section.accentColor}20`, color: section.accentColor }}
          >
            {section.icon}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{section.title}</h2>
            <p className="text-xs text-white/50">{section.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {stagedCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              {stagedCount} staged
            </span>
          )}
          <span className="text-white/40">
            {collapsed ? <IconEye size={16} /> : <IconEyeOff size={16} />}
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      {!collapsed && (
        <div className="space-y-3 border-t border-white/[0.06] px-6 pb-6 pt-5">
          {section.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={draft[field.key]}
              stagedFile={field.slot ? (files[field.slot] ?? null) : null}
              saving={saving}
              onChange={onFieldChange}
              onFileChange={onFileChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminHomepagePage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [files, setFiles] = useState<Partial<Record<HomepageVideoSlot, File | null>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionId>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        setDraft(await fetchHomepageContent());
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load homepage content.',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const updateField = useCallback((key: keyof HomepageContent, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const updateFile = useCallback((slot: HomepageVideoSlot, file: File | null) => {
    setFiles((prev) => ({ ...prev, [slot]: file }));
  }, []);

  const toggleSection = useCallback((id: SectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Count total staged files
  const totalStaged = Object.values(files).filter(Boolean).length;

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const next = { ...draft };

      // Upload all staged files first
      for (const section of SECTIONS) {
        for (const field of section.fields) {
          const file = field.slot ? files[field.slot] : null;
          if (!field.slot || !file) continue;
          const uploadedUrl = await uploadHomepageMedia(field.slot, file);
          next[field.key] = uploadedUrl;
        }
      }

      const saved = await saveHomepageContent(next);
      setDraft(saved);
      setFiles({});
      setSavedAt(new Date());
      addToast({ type: 'success', message: 'Homepage content saved successfully.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save homepage content.',
      });
    } finally {
      setSaving(false);
    }
  }, [addToast, draft, files]);

  return (
    <div className="flex min-h-full flex-col gap-6 p-4 md:p-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <IconArrowLeft size={14} />
              View homepage
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white">Homepage Admin</h1>
          <p className="mt-1 text-sm text-white/50">
            Edit the homepage trailer, register link, and event/recognition videos. Changes take effect immediately after saving.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400/80">
              <IconCheck size={13} />
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          {totalStaged > 0 && (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
              <IconUpload size={12} className="mr-1 inline" />
              {totalStaged} file{totalStaged > 1 ? 's' : ''} staged
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate('/home')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!draft || saving}
            onClick={() => void handleSave()}
            className="min-w-[130px]"
          >
            {saving ? (
              <>
                <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : (
              <>
                <IconDeviceFloppy size={15} className="mr-1.5" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#1a1d25] p-16">
          <div className="flex flex-col items-center gap-3 text-white/40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            <span className="text-sm">Loading homepage content…</span>
          </div>
        </div>
      )}

      {/* ── Section cards ── */}
      {!loading && draft && (
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              draft={draft}
              files={files}
              saving={saving}
              collapsed={collapsedSections.has(section.id)}
              onToggleCollapse={() => toggleSection(section.id)}
              onFieldChange={updateField}
              onFileChange={updateFile}
            />
          ))}
        </div>
      )}

      {/* ── Bottom save bar (sticky) ── */}
      {!loading && draft && (
        <div className="sticky bottom-4 mt-2">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#1a1d25]/95 px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <p className="text-sm text-white/50">
              {totalStaged > 0
                ? `${totalStaged} file${totalStaged > 1 ? 's' : ''} staged for upload`
                : 'All changes will be saved to Firestore'}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={!draft || saving}
              onClick={() => void handleSave()}
              className="min-w-[120px]"
            >
              {saving ? 'Saving…' : 'Save all changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
