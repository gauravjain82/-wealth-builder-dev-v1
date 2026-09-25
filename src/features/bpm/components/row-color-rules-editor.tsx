import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Checkbox,
  ConfirmationDialog,
  Input,
  Label,
  Select,
  isHexAvailable,
  normalizeHex,
  resolveRowColors,
  rowColorLabel,
  rowColorStyle,
} from '@shared/components';
import type { RowColorStyle } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMRowColorRule, BPMRowColorRulePayload } from '../types';

/**
 * Row-colour CRUD.
 *
 * Edited inline on the page rather than in a modal, deliberately: `Modal`
 * unmounts its children when closed, so a form inside one forgets everything
 * on every close — the reason the Add Guest form keeps its values in a
 * module-level cache. A list of rows that are edited in place has nothing to
 * forget.
 *
 * The built-in schemes are rows like any other since Phase 7, so they are
 * recoloured, reordered and switched off here the same way as a custom rule.
 * Only two things are fixed on them: their condition key, which the lists emit
 * by name, and their existence — disabling is the supported way to retire one,
 * and it is reversible.
 *
 * The preview beside each row runs the *real* resolver on that rule alone, so
 * what is shown is exactly what a list would paint. The colour input validates
 * against the whole rule set through `isHexAvailable`, which compares
 * normalised hexes — the server enforces the same rule, this only saves a round
 * trip.
 */

const STYLE_OPTIONS: { value: RowColorStyle; label: string }[] = [
  { value: 'fill', label: 'Fill the row' },
  { value: 'border', label: 'Outline the row' },
  { value: 'left-border', label: 'Left accent bar' },
];

type Draft = Pick<BPMRowColorRulePayload, 'key' | 'label' | 'hex' | 'style' | 'priority' | 'enabled'>;

const emptyDraft = (): Draft => ({
  key: '',
  label: '',
  hex: '#6366f1',
  style: 'fill',
  priority: 100,
  enabled: true,
});

/** A single rule painted with the real resolver, so the preview cannot lie. */
function RulePreview({ rule }: { rule: BPMRowColorRule }) {
  const resolved = resolveRowColors([rule.key], [{ ...rule, enabled: true }]);
  return (
    <div
      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:text-white/80"
      style={rowColorStyle(resolved)}
      title={rowColorLabel(resolved) || undefined}
    >
      Sample row
    </div>
  );
}

interface RowColorRulesEditorProps {
  rules: BPMRowColorRule[];
  /** Called after any successful write so the shared rule set is re-read. */
  onChanged: () => void | Promise<void>;
}

export function RowColorRulesEditor({ rules, onChanged }: RowColorRulesEditorProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BPMRowColorRule | null>(null);

  useEffect(() => {
    const next: Record<number, Draft> = {};
    rules.forEach((rule) => {
      next[rule.id] = {
        key: rule.key,
        label: rule.label,
        hex: rule.hex,
        style: rule.style,
        priority: rule.priority,
        enabled: rule.enabled,
      };
    });
    setDrafts(next);
  }, [rules]);

  const patchDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const run = async (id: number | 'new', message: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      addToast({ type: 'success', message });
      await onChanged();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setBusyId(null);
    }
  };

  /** Colours already taken, for the live "that one is used" hint on the new row. */
  const newHexFree = useMemo(
    () => newDraft.hex.trim() === '' || isHexAvailable(newDraft.hex, rules),
    [newDraft.hex, rules],
  );

  const canCreate =
    newDraft.key.trim().length > 0 &&
    newDraft.label.trim().length > 0 &&
    normalizeHex(newDraft.hex) !== null &&
    newHexFree;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
              <th className="px-3 py-2">On</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Condition key</th>
              <th className="px-3 py-2">Colour</th>
              <th className="px-3 py-2">Style</th>
              <th className="px-3 py-2" title="Lower wins when two rules fire on the same channel">
                Priority
              </th>
              <th className="px-3 py-2">Preview</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const draft = drafts[rule.id];
              if (!draft) return null;
              const busy = busyId === rule.id;
              const hexValid = normalizeHex(draft.hex) !== null;
              const hexFree = isHexAvailable(draft.hex, rules, rule.key);
              const dirty =
                draft.label !== rule.label ||
                draft.key !== rule.key ||
                normalizeHex(draft.hex) !== normalizeHex(rule.hex) ||
                draft.style !== rule.style ||
                draft.priority !== rule.priority ||
                draft.enabled !== rule.enabled;

              return (
                <tr key={rule.id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={draft.enabled}
                      disabled={busy}
                      aria-label={`Enable ${rule.label}`}
                      onChange={(e) => patchDraft(rule.id, { enabled: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={draft.label}
                      disabled={busy}
                      aria-label={`Name for ${rule.label}`}
                      onChange={(e) => patchDraft(rule.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={draft.key}
                      // Built-in keys are emitted verbatim by the guest lists,
                      // so renaming one would not move the rule — it would
                      // silently switch it off. The server refuses it too.
                      disabled={busy || rule.reserved}
                      aria-label={`Condition key for ${rule.label}`}
                      onChange={(e) => patchDraft(rule.id, { key: e.target.value })}
                    />
                    {rule.reserved ? (
                      <span className="text-[11px] text-slate-400 dark:text-white/40">Built-in</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-8 w-8 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-white/15"
                        value={normalizeHex(draft.hex) ?? '#000000'}
                        disabled={busy}
                        aria-label={`Colour for ${rule.label}`}
                        onChange={(e) => patchDraft(rule.id, { hex: e.target.value })}
                      />
                      <Input
                        className="w-28"
                        value={draft.hex}
                        disabled={busy}
                        aria-label={`Colour hex for ${rule.label}`}
                        onChange={(e) => patchDraft(rule.id, { hex: e.target.value })}
                      />
                    </div>
                    {!hexValid ? (
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">Not a hex colour</span>
                    ) : !hexFree ? (
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">
                        Already used by another rule
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={draft.style}
                      disabled={busy}
                      aria-label={`Style for ${rule.label}`}
                      onChange={(e) => patchDraft(rule.id, { style: e.target.value as RowColorStyle })}
                    >
                      {STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={draft.priority}
                      disabled={busy}
                      aria-label={`Priority for ${rule.label}`}
                      onChange={(e) => patchDraft(rule.id, { priority: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <RulePreview rule={{ ...rule, ...draft, id: rule.id }} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={busy || !dirty || !hexValid || !hexFree}
                        onClick={() =>
                          void run(rule.id, `${draft.label} saved.`, () =>
                            bpmService.updateRowColorRule(rule.id, draft),
                          )
                        }
                      >
                        Save
                      </Button>
                      {rule.reserved ? null : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          aria-label={`Delete ${rule.label}`}
                          onClick={() => setDeleteTarget(rule)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 dark:border-white/15">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
          Add a colour scheme
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="new-rule-label">Name</Label>
            <Input
              id="new-rule-label"
              value={newDraft.label}
              placeholder="Hot prospect"
              onChange={(e) => setNewDraft((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="new-rule-key">Condition key</Label>
            <Input
              id="new-rule-key"
              value={newDraft.key}
              placeholder="tracker.prospect.hot"
              onChange={(e) => setNewDraft((prev) => ({ ...prev, key: e.target.value }))}
            />
            <p className="text-[11px] text-slate-400 dark:text-white/40">
              The identifier a list reports for this state. A rule with a key nothing emits
              simply never fires.
            </p>
          </div>
          <div>
            <Label htmlFor="new-rule-hex">Colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-9 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-white/15"
                value={normalizeHex(newDraft.hex) ?? '#000000'}
                aria-label="New rule colour"
                onChange={(e) => setNewDraft((prev) => ({ ...prev, hex: e.target.value }))}
              />
              <Input
                id="new-rule-hex"
                value={newDraft.hex}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, hex: e.target.value }))}
              />
            </div>
            {!newHexFree ? (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                That colour already means something else.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="new-rule-style">Style</Label>
            <Select
              id="new-rule-style"
              value={newDraft.style}
              onChange={(e) => setNewDraft((prev) => ({ ...prev, style: e.target.value as RowColorStyle }))}
            >
              {STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            disabled={busyId === 'new' || !canCreate}
            onClick={() =>
              void run('new', `${newDraft.label} added.`, async () => {
                await bpmService.createRowColorRule(newDraft);
                setNewDraft(emptyDraft());
              })
            }
          >
            Add scheme
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete colour scheme"
        message={`Delete "${deleteTarget?.label}"? Rows in that state will simply render plain.`}
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) {
            void run(target.id, `${target.label} deleted.`, () =>
              bpmService.deleteRowColorRule(target.id),
            );
          }
        }}
      />
    </div>
  );
}
