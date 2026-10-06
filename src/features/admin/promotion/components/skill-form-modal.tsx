import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@/shared/components';
import { useContentAction } from '../hooks/use-promotion-admin';
import { createSkill, updateSkill } from '../services/promotion-admin-service';
import { SKILL_TAG_LABELS, type AdminSkill, type AdminTrack, type SkillTag } from '../types';

interface SkillFormModalProps {
  open: boolean;
  tracks: AdminTrack[];
  /** Track a new skill is added to. Ignored when editing. */
  defaultTrackId: number | null;
  /** When set, the modal edits (and can move) this skill; otherwise it creates one. */
  editing: AdminSkill | null;
  onClose: () => void;
}

const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700 dark:text-white/80';

export function SkillFormModal({
  open,
  tracks,
  defaultTrackId,
  editing,
  onClose,
}: SkillFormModalProps) {
  const run = useContentAction();
  const [label, setLabel] = useState('');
  const [tag, setTag] = useState<SkillTag>('skill');
  const [trackId, setTrackId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? '');
    setTag(editing?.tag ?? 'skill');
    setTrackId(String(editing?.track ?? defaultTrackId ?? ''));
  }, [open, editing, defaultTrackId]);

  const moving = !!editing && Number(trackId) !== editing.track;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { label: label.trim(), tag, track: Number(trackId) };
    setSaving(true);
    const ok = await run(
      () => (editing ? updateSkill(editing.id, payload) : createSkill(payload)),
      editing ? (moving ? 'Skill moved' : 'Skill saved') : 'Skill added'
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit skill' : 'Add skill'}
      onClose={onClose}
      contentClassName="max-w-[480px]"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="promo-skill-label" className={LABEL_CLASS}>
            Name <span className="font-normal text-red-500">*</span>
          </label>
          <Input
            id="promo-skill-label"
            placeholder="e.g. Field Training"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={255}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="promo-skill-tag" className={LABEL_CLASS}>
            Type
          </label>
          <Select
            id="promo-skill-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value as SkillTag)}
          >
            {(Object.keys(SKILL_TAG_LABELS) as SkillTag[]).map((value) => (
              <option key={value} value={value}>
                {SKILL_TAG_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="promo-skill-track" className={LABEL_CLASS}>
            Promotion track
          </label>
          <Select
            id="promo-skill-track"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
          >
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </Select>
          {moving && (
            <p className="mt-1 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-400/15 dark:text-sky-200">
              The skill and all its videos move to the end of that track. Agents keep the
              progress they have already made on these videos.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !label.trim() || !trackId}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Add skill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
