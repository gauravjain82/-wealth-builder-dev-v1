import { useEffect, useMemo, useRef, useState } from 'react';
import { Block, Button, Input, Label, Select } from '@/shared/components';
import { useToastStore } from '@/store';
import type {
  HomeMediaType,
  HomePageConfig,
  HomePageMedia,
  HomePageSlot,
} from '@/features/home/services/home-content-service';
import {
  fetchHomeConfig,
  listHomeMedia,
  updateHomeConfig,
  updateHomeMedia,
  uploadHomeMedia,
} from '../services/home-content-admin-service';

/** Logical display order (backend returns slots alphabetically). */
const SLOT_ORDER: HomePageSlot[] = ['hero_trailer', 'background', 'events', 'recognition'];

const SLOT_HINTS: Record<HomePageSlot, string> = {
  hero_trailer: 'The autoplaying video at the top of the home page.',
  background: 'The full-page background image behind the home page.',
  events: 'The "Event & Contests" card. Canva designs use an embed URL.',
  recognition: 'The "Recognition" card. Canva designs use an embed URL.',
};

function MediaRow({
  media,
  onSaved,
}: {
  media: HomePageMedia;
  onSaved: (updated: HomePageMedia) => void;
}) {
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(media.label);
  const [mediaType, setMediaType] = useState<HomeMediaType>(media.media_type);
  const [href, setHref] = useState(media.href);
  const [isActive, setIsActive] = useState(media.is_active);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isUpload = mediaType === 'video' || mediaType === 'image';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateHomeMedia(media.id, {
        label,
        media_type: mediaType,
        // When switching to an uploaded file, href is managed by the upload
        // endpoint, so only send it for embed/external URLs.
        ...(isUpload ? {} : { href }),
        is_active: isActive,
      });
      onSaved(updated);
      addToast({ type: 'success', message: `${updated.label} saved` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadHomeMedia(media.id, file);
      setHref(result.media.href);
      setMediaType(result.media.media_type);
      onSaved(result.media);
      addToast({ type: 'success', message: `${result.media.label} uploaded` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1d25] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{media.label}</h3>
          <p className="text-xs text-white/50">{SLOT_HINTS[media.slot]}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Visible
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input
              variant="surface"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div>
            <Label>Source</Label>
            <Select
              value={isUpload ? 'upload' : 'embed'}
              onChange={(event) =>
                setMediaType(event.target.value === 'upload' ? 'video' : 'embed')
              }
            >
              <option value="embed">External / embed URL (Canva, YouTube, link)</option>
              <option value="upload">Uploaded file</option>
            </Select>
          </div>

          {isUpload ? (
            <div>
              <Label>Upload {media.slot === 'background' ? 'image' : 'video'}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={media.slot === 'background' ? 'image/*' : 'video/*'}
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400/20 file:px-3 file:py-1.5 file:text-amber-200"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {uploading && <p className="mt-1 text-xs text-white/50">Uploading…</p>}
              {href && (
                <p className="mt-1 truncate text-xs text-white/40" title={href}>
                  Current: {href}
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label>URL</Label>
              <Input
                variant="surface"
                value={href}
                placeholder="https://…"
                onChange={(event) => setHref(event.target.value)}
              />
            </div>
          )}

          <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-2">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Preview</p>
          {href ? (
            media.media_type === 'image' ? (
              <img src={href} alt={media.label} className="max-h-48 w-full rounded object-cover" />
            ) : media.media_type === 'video' ? (
              <video src={href} controls className="max-h-48 w-full rounded" />
            ) : (
              <iframe
                src={href}
                title={media.label}
                className="h-48 w-full rounded border-0"
                allowFullScreen
              />
            )
          ) : (
            <p className="py-8 text-center text-sm text-white/40">No media set.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeConfigCard() {
  const { addToast } = useToastStore();
  const [config, setConfig] = useState<HomePageConfig | null>(null);
  const [heroTitle, setHeroTitle] = useState('');
  const [registerUrl, setRegisterUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchHomeConfig();
        setConfig(data);
        setHeroTitle(data.hero_title);
        setRegisterUrl(data.register_url);
      } catch {
        // Media rows still load independently.
      }
    })();
  }, []);

  if (!config) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateHomeConfig({
        hero_title: heroTitle,
        register_url: registerUrl,
      });
      setConfig(updated);
      addToast({ type: 'success', message: 'Hero settings saved' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1d25] p-4">
      <h3 className="mb-3 text-base font-semibold text-white">Hero banner</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Hero title</Label>
          <Input
            variant="surface"
            value={heroTitle}
            onChange={(event) => setHeroTitle(event.target.value)}
          />
        </div>
        <div>
          <Label>Register button URL</Label>
          <Input
            variant="surface"
            value={registerUrl}
            placeholder="https://…"
            onChange={(event) => setRegisterUrl(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export default function AdminHomeContentPage() {
  const { addToast } = useToastStore();
  const [media, setMedia] = useState<HomePageMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setMedia(await listHomeMedia());
      } catch (error) {
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load home content',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const orderedMedia = useMemo(
    () =>
      [...media].sort(
        (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
      ),
    [media]
  );

  const handleSaved = (updated: HomePageMedia) => {
    setMedia((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Block
        title="Home Content"
        description="Manage the home page hero video, background, and the Events & Recognition cards. Each slot can use an uploaded file or an external/embed URL."
        titleVariant="h5"
        className="flex-shrink-0"
      />

      {loading ? (
        <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
          Loading home content…
        </div>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto">
          <HomeConfigCard />
          {orderedMedia.map((item) => (
            <MediaRow key={item.id} media={item} onSaved={handleSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
