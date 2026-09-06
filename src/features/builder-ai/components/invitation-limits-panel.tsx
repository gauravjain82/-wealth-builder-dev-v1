/**
 * InvitationLimitsPanel — view/edit the per-program invitation policy
 * (`BuilderInvitationRule`): how many people each inviter may bring in, how deep, and
 * the token expiry. Reads as a compact summary; managers can expand it to edit.
 *
 * `cap` / `cap_if_company_owner` are `null` for "unlimited" — a blank input clears the
 * cap. The backend enforces `builder_invitation:manage` on save.
 */

import { useEffect, useState } from 'react';
import { Pencil, ShieldCheck, X } from 'lucide-react';
import { Button, Checkbox, Input } from '@shared/components';
import type { InvitationRuleConfig, InvitationRuleWriteInput } from '../types';

/** Parse a numeric input to a number, or `null` when blank/invalid (= unlimited). */
function numOrNull(value: string): number | null {
  const t = value.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

/** Parse a required positive integer input, falling back to `fallback` when blank. */
function intOr(value: string, fallback: number): number {
  const n = numOrNull(value);
  return n == null || n < 0 ? fallback : Math.floor(n);
}

const capText = (n: number | null) => (n == null ? 'Unlimited' : String(n));

export function InvitationLimitsPanel({
  rule,
  canManage,
  isSaving,
  onSave,
}: {
  rule: InvitationRuleConfig | null;
  canManage: boolean;
  isSaving: boolean;
  onSave: (payload: InvitationRuleWriteInput) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InvitationRuleConfig | null>(rule);

  // Reset the draft whenever the underlying rule changes or the editor (re)opens.
  useEffect(() => {
    setDraft(rule);
  }, [rule, editing]);

  if (!rule) return null;

  const submit = async () => {
    if (!draft) return;
    await onSave({
      max_depth: draft.max_depth,
      cap: draft.cap,
      cap_if_company_owner: draft.cap_if_company_owner,
      expires_in_hours: draft.expires_in_hours,
      allow_resend: draft.allow_resend,
      is_active: draft.is_active,
    });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <ShieldCheck size={16} /> Invitation limits
        </h2>
        {canManage &&
          (editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Close"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
          ))}
      </div>

      {!editing || !draft ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600 dark:text-white/70">
          <span>
            Cap per inviter: <b className="text-slate-900 dark:text-white">{capText(rule.cap)}</b>
          </span>
          <span>
            Company-owner cap:{' '}
            <b className="text-slate-900 dark:text-white">{capText(rule.cap_if_company_owner)}</b>
          </span>
          <span>
            Team depth: <b className="text-slate-900 dark:text-white">{rule.max_depth}</b>
          </span>
          <span>
            Expiry: <b className="text-slate-900 dark:text-white">{rule.expires_in_hours}h</b>
          </span>
          <span>
            Resend:{' '}
            <b className="text-slate-900 dark:text-white">{rule.allow_resend ? 'On' : 'Off'}</b>
          </span>
          <span>
            Status:{' '}
            <b className="text-slate-900 dark:text-white">{rule.is_active ? 'Active' : 'Off'}</b>
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
                Cap per inviter
              </label>
              <Input
                type="number"
                value={draft.cap ?? ''}
                placeholder="Unlimited"
                onChange={(e) => setDraft((d) => d && { ...d, cap: numOrNull(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
                Company-owner cap
              </label>
              <Input
                type="number"
                value={draft.cap_if_company_owner ?? ''}
                placeholder="Unlimited"
                onChange={(e) =>
                  setDraft((d) => d && { ...d, cap_if_company_owner: numOrNull(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
                Team depth
              </label>
              <Input
                type="number"
                value={draft.max_depth}
                onChange={(e) =>
                  setDraft((d) => d && { ...d, max_depth: intOr(e.target.value, 1) })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-white/60">
                Expiry (hours)
              </label>
              <Input
                type="number"
                value={draft.expires_in_hours}
                onChange={(e) =>
                  setDraft((d) => d && { ...d, expires_in_hours: intOr(e.target.value, 72) })
                }
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Cap counts a member&apos;s invited + active builders within the team depth. Blank =
            unlimited. Company-owner cap (when set) overrides the base cap for SMD-band inviters.
          </p>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
              <Checkbox
                checked={draft.allow_resend}
                onChange={(e) => setDraft((d) => d && { ...d, allow_resend: e.target.checked })}
              />
              Allow resend
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
              <Checkbox
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => d && { ...d, is_active: e.target.checked })}
              />
              Rule active
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save limits'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
