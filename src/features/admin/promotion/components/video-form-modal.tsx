import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@/shared/components';
import { getEmbedVideoUrl } from '@/features/promotion/video-url';
import { useContentAction } from '../hooks/use-promotion-admin';
import { createVideo, updateVideo } from '../services/promotion-admin-service';
import type { AdminTrack, AdminVideo } from '../types';

interface VideoFormModalProps {
  open: boolean;
  tracks: AdminTrack[];
  /** Skill a new video is added to. Ignored when editing. */
  defaultSkillId: number | null;
  /** When set, the modal edits (and can move) this video; otherwise it creates one. */
  editing: AdminVideo | null;
  onClose: () => void;
}

const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700 dark:text-white/80';
const OPTIONAL = (
  <span className="font-normal text-slate-400 dark:text-white/40">(optional)</span>
);

/** Same rule as the learner's VideoModal: page links play in an iframe, files in <video>. */
function isEmbedUrl(url: string) {
  return url.includes('vimeo.com') || url.includes('youtube.com') || url.includes('youtu.be');
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function VideoFormModal({
  open,
  tracks,
  defaultSkillId,
  editing,
  onClose,
}: VideoFormModalProps) {
  const run = useContentAction();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('5 min');
  const [skillId, setSkillId] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setSubtitle(editing?.subtitle ?? '');
    setVideoUrl(editing?.video_url ?? '');
    setDuration(editing?.duration_label ?? '5 min');
    setSkillId(String(editing?.skill ?? defaultSkillId ?? ''));
    setPreviewing(false);
  }, [open, editing, defaultSkillId]);

  const url = videoUrl.trim();
  const urlInvalid = url !== '' && !isHttpUrl(url);
  const moving = !!editing && Number(skillId) !== editing.skill;
  const embedSrc = getEmbedVideoUrl(url);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      skill: Number(skillId),
      title: title.trim(),
      subtitle: subtitle.trim(),
      video_url: url,
      duration_label: duration.trim() || '5 min',
    };
    setSaving(true);
    const ok = await run(
      () => (editing ? updateVideo(editing.id, payload) : createVideo(payload)),
      editing ? (moving ? 'Video moved' : 'Video saved') : 'Video added'
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit video' : 'Add video'}
      onClose={onClose}
      contentClassName="max-w-[560px]"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="promo-video-title" className={LABEL_CLASS}>
            Title <span className="font-normal text-red-500">*</span>
          </label>
          <Input
            id="promo-video-title"
            placeholder="e.g. How to book an appointment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="promo-video-subtitle" className={LABEL_CLASS}>
            Subtitle {OPTIONAL}
          </label>
          <Input
            id="promo-video-subtitle"
            placeholder="A short line under the title"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={255}
          />
        </div>

        <div>
          <label htmlFor="promo-video-url" className={LABEL_CLASS}>
            Video link
          </label>
          <div className="flex gap-2">
            <Input
              id="promo-video-url"
              type="url"
              placeholder="https://vimeo.com/… or https://youtu.be/…"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setPreviewing(false);
              }}
              maxLength={500}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewing((value) => !value)}
              disabled={!url || urlInvalid}
            >
              {previewing ? 'Hide' : 'Preview'}
            </Button>
          </div>
          {urlInvalid ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
              Enter a full link starting with https://
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
              {url
                ? 'Vimeo and YouTube page links are converted to the player automatically.'
                : 'Leave empty to show this video as “Pending Video” until the link is ready.'}
            </p>
          )}
          {previewing && url && !urlInvalid && (
            <div className="mt-2 aspect-video overflow-hidden rounded-lg bg-black">
              {isEmbedUrl(embedSrc) ? (
                <iframe
                  src={embedSrc}
                  title={title || 'Video preview'}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <video src={embedSrc} className="h-full w-full" controls playsInline />
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
          <div>
            <label htmlFor="promo-video-duration" className={LABEL_CLASS}>
              Duration
            </label>
            <Input
              id="promo-video-duration"
              placeholder="5 min"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="promo-video-skill" className={LABEL_CLASS}>
              Skill
            </label>
            <Select
              id="promo-video-skill"
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
            >
              {tracks.map((track) => (
                <optgroup key={track.id} label={track.name}>
                  {track.skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
        </div>
        {moving && (
          <p className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-400/15 dark:text-sky-200">
            The video and its quiz move to the end of that skill. Agents who already watched
            it keep their progress.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !title.trim() || !skillId || urlInvalid}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Add video'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
