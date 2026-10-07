import { useEffect, useState } from 'react';
import { Button, Input, Label, Modal, Text } from '@shared/components';
import type { EmailRun } from '../../types/external-tickets';
import { EXCLUDED_LABEL, RUN_KIND, formatWhen } from './email-labels';

interface SendConfirmModalProps {
  draft: EmailRun | null;
  sending: boolean;
  error: string | null;
  onConfirm: (count: number) => void;
  onDiscard: () => void;
}

/**
 * The only way an email leaves: a prepared draft (nothing sent yet) plus the
 * recipient count typed back by hand. The server checks the count again and
 * refuses if the list changed since the draft was prepared.
 */
export function SendConfirmModal({ draft, sending, error, onConfirm, onDiscard }: SendConfirmModalProps) {
  const [typed, setTyped] = useState('');
  useEffect(() => setTyped(''), [draft?.id]);
  if (!draft) return null;

  const count = draft.recipient_count;
  const bulk = draft.kind === 'bulk';
  const matches = typed.trim() === String(count);
  const excluded = Object.entries(draft.excluded).filter(([, n]) => n > 0);
  const people = `${count} ${count === 1 ? 'person' : 'people'}`;

  return (
    <Modal open onClose={onDiscard} title={`${RUN_KIND[draft.kind]} — confirm`} className="max-w-2xl">
      <div className="space-y-4 text-sm">
        <div
          role="alert"
          className={`rounded-lg border p-3 ${bulk ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300' : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'}`}
        >
          <p className="font-semibold">
            This will email {people} ({draft.ticket_count} ticket{draft.ticket_count === 1 ? '' : 's'}) for real.
          </p>
          <p>Emails cannot be recalled once sent. Nothing has been sent yet.</p>
        </div>

        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-500">Subject</dt>
          <dd>{draft.subject}</dd>
          <dt className="text-slate-500">Recipients</dt>
          <dd>{people} — one email per person, carrying all of their tickets</dd>
          {excluded.length ? (
            <>
              <dt className="text-slate-500">Not emailed</dt>
              <dd>{excluded.map(([reason, n]) => `${n} ${EXCLUDED_LABEL[reason] ?? reason}`).join(' · ')} (tickets)</dd>
            </>
          ) : null}
          <dt className="text-slate-500">Prepared</dt>
          <dd>{formatWhen(draft.created_at)} by {draft.created_by || 'you'} · expires {formatWhen(draft.expires_at)}</dd>
        </dl>

        {draft.sample?.length ? (
          <div>
            <Text variant="muted" className="mb-1 text-xs uppercase">{bulk ? 'First recipients' : 'Recipients'}</Text>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-white/5 dark:border-white/10">
              {draft.sample.map((d) => (
                <li key={d.id} className="flex flex-wrap justify-between gap-2 px-3 py-1.5">
                  <span>{d.tickets.map((t) => t.holder).filter(Boolean)[0] || d.first_name || '—'}</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{d.address}</span>
                  <span className="text-xs text-slate-500">{d.tickets.length} ticket{d.tickets.length === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="confirm-count">
            To confirm, type the number of people: <span className="font-mono font-bold">{count}</span>
          </Label>
          <Input
            id="confirm-count"
            inputMode="numeric"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="max-w-[160px]"
          />
        </div>

        {error ? <p role="alert" className="text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={sending}>Cancel — send nothing</Button>
          <Button
            variant={bulk ? 'destructive' : 'default'}
            disabled={!matches || sending}
            onClick={() => onConfirm(Number(typed.trim()))}
          >
            {sending ? 'Starting…' : `Send to ${people}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
