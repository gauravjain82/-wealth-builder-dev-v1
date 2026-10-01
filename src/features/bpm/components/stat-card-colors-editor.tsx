import { useEffect, useRef, useState } from 'react';
import { Button, Input, normalizeHex } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMSettings, BPMStatCardKey } from '../types';

/**
 * Background color for each stat card on Guest Check-In and Associate Check-In.
 *
 * Saved as one map behind a Save button rather than per change like the
 * switches: a color picker fires on every drag, and ten cards picked one at a
 * time would be ten writes each re-rendering both check-in screens.
 *
 * The swatch is styled like the real card — white text on the color — so a
 * color too pale to read white on shows up here rather than at the door.
 */

/** Every configurable card, in the order the two check-in screens show them. */
const CARDS: { key: BPMStatCardKey; label: string }[] = [
  { key: 'guests_invited', label: 'Guests Invited' },
  { key: 'guests_checked_in', label: 'Guests Checked In' },
  { key: 'guests_ratio', label: 'Attendance Ratio' },
  { key: 'agents_invited', label: 'Agents Invited' },
  { key: 'agents_checked_in', label: 'Agents Checked In' },
  { key: 'inviter', label: 'Top Inviter' },
  { key: 'leader', label: 'Top Leader' },
  { key: 'md', label: 'Top MD' },
  { key: 'smd', label: 'Top SMD' },
  { key: 'direct', label: 'Top Direct' },
];

/** Shown only for a key the server did not send (a stale payload). */
const FALLBACK_HEX = '#64748b';

type Drafts = Record<BPMStatCardKey, string>;

const draftsFrom = (settings: BPMSettings): Drafts =>
  Object.fromEntries(
    CARDS.map(({ key }) => [key, settings.stat_card_colors?.[key] ?? FALLBACK_HEX]),
  ) as Drafts;

interface StatCardColorsEditorProps {
  settings: BPMSettings;
  /** Called with the server's answer after a successful save. */
  onSaved: (settings: BPMSettings) => void;
}

export function StatCardColorsEditor({ settings, onSaved }: StatCardColorsEditorProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFrom(settings));
  const [saving, setSaving] = useState(false);

  // Reset the drafts only when the saved colors themselves change. `settings`
  // is a new object after any save on the page — a switch flipped beside this
  // editor must not throw away colors picked here and not yet saved.
  const savedKey = CARDS.map(({ key }) => settings.stat_card_colors?.[key] ?? FALLBACK_HEX).join('|');
  const lastSavedKey = useRef(savedKey);
  useEffect(() => {
    if (lastSavedKey.current === savedKey) return;
    lastSavedKey.current = savedKey;
    setDrafts(draftsFrom(settings));
  }, [savedKey, settings]);

  const invalid = CARDS.filter(({ key }) => normalizeHex(drafts[key]) === null);
  const dirty = CARDS.some(
    ({ key }) =>
      normalizeHex(drafts[key]) !== normalizeHex(settings.stat_card_colors?.[key] ?? FALLBACK_HEX),
  );

  const save = async () => {
    setSaving(true);
    try {
      const stat_card_colors = Object.fromEntries(
        CARDS.map(({ key }) => [key, normalizeHex(drafts[key]) as string]),
      ) as Record<BPMStatCardKey, string>;
      onSaved(await bpmService.updateSettings({ stat_card_colors }));
      addToast({ type: 'success', message: 'Stat card colors saved.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save stat card colors',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <ul className="divide-y divide-slate-100 dark:divide-white/10">
        {CARDS.map(({ key, label }) => {
          const hex = normalizeHex(drafts[key]);
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-[140px] flex-1 text-sm font-medium text-slate-900 dark:text-white">
                {label}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-8 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-white/15"
                  value={hex ?? '#000000'}
                  disabled={saving}
                  aria-label={`${label} color`}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                />
                <Input
                  className="w-28"
                  value={drafts[key]}
                  disabled={saving}
                  aria-label={`${label} color hex`}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
              {/* Same shape and type as the card on the check-in screens. */}
              <div
                className="w-32 rounded-xl px-3 py-2 text-left text-white shadow-sm"
                style={{ backgroundColor: hex ?? FALLBACK_HEX }}
                aria-hidden="true"
              >
                <div className="truncate text-[10px] font-medium uppercase tracking-wide text-white/80">
                  {label}
                </div>
                <div className="text-lg font-bold leading-tight">12</div>
              </div>
              {!hex ? (
                <span className="w-full text-[11px] text-rose-600 dark:text-rose-400">
                  Not a hex color
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex justify-end">
        <Button disabled={saving || !dirty || invalid.length > 0} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save colors'}
        </Button>
      </div>
    </div>
  );
}
