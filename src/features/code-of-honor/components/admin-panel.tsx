/**
 * Administration: the product rules and the Code of Honor values.
 *
 * "Who can do what" is deliberately not here: committee and administrator access is
 * granted in the platform's Access Console (`code_of_honor:*` permissions), the one
 * place every other feature's access is managed too.
 */

import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/button';

import { useAdminSettings, useAdminValues, useSaveAdminSettings, useSaveAdminValue } from '../hooks/use-code-of-honor';
import { CohError } from '../services/code-of-honor-service';
import type { AdminSettings, AdminValue } from '../types';
import { ErrorNotice, Loading } from './states';
import { errorMessage } from './error-message';

const NUMBER_FIELDS: { key: keyof AdminSettings; label: string }[] = [
  { key: 'submissions_per_month', label: 'Posts per member per month' },
  { key: 'likes_per_voter', label: 'Likes per member' },
  { key: 'runoff_likes_per_voter', label: 'Likes per member in a runoff' },
  { key: 'min_text_length', label: 'Shortest act (characters)' },
  { key: 'max_text_length', label: 'Longest act (characters)' },
  { key: 'max_secondary_values', label: 'Extra values per act' },
];

const TOGGLES: { key: keyof AdminSettings; label: string }[] = [
  { key: 'require_approval', label: 'Every act needs committee approval before the vote' },
  { key: 'allow_secondary_values', label: 'Posters may pick extra values' },
  { key: 'reveal_submitter', label: 'Reveal who posted each act after the month closes' },
];

export function AdminPanel({ canSettings, canValues }: { canSettings: boolean; canValues: boolean }) {
  return (
    <div className="wb-coh-admin">
      <p className="wb-coh-muted">
        Committee and administrator access is granted in the Access Console (Code of Honor permissions).
      </p>
      {canSettings && <RulesForm />}
      {canValues && <ValuesEditor />}
    </div>
  );
}

function RulesForm() {
  const query = useAdminSettings();
  const save = useSaveAdminSettings();
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [coinsText, setCoinsText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setDraft(query.data.settings);
      setCoinsText(query.data.settings.coins.join(', '));
    }
  }, [query.data]);

  if (query.isLoading || !draft) return query.isError ? <ErrorNotice error={query.error} onRetry={() => query.refetch()} /> : <Loading label="Loading rules" />;
  const fieldError = save.error instanceof CohError ? (save.error.detail.field as string | undefined) : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const coins = coinsText.split(',').map((part) => Number(part.trim())).filter((n) => !Number.isNaN(n));
    save.mutate({ ...draft, coins }, { onSuccess: () => setSaved(true) });
  };

  return (
    <form className="wb-coh-panel wb-coh-form" onSubmit={submit}>
      <h3 className="wb-coh-heading">Rules</h3>
      <div className="wb-coh-grid">
        {NUMBER_FIELDS.map(({ key, label }) => (
          <div key={key} className="wb-coh-field">
            <label className="wb-coh-label" htmlFor={`wb-coh-rule-${key}`}>{label}</label>
            <input
              id={`wb-coh-rule-${key}`}
              className="wb-coh-input"
              type="number"
              min={1}
              value={draft[key] as number}
              aria-invalid={fieldError === key}
              onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })}
            />
            {fieldError === key && <span className="wb-coh-hint wb-coh-hint--warn">{errorMessage(save.error)}</span>}
          </div>
        ))}
        <div className="wb-coh-field">
          <label className="wb-coh-label" htmlFor="wb-coh-rule-coins">Coins for 1st, 2nd, 3rd…</label>
          <input
            id="wb-coh-rule-coins"
            className="wb-coh-input"
            value={coinsText}
            aria-invalid={fieldError === 'coins'}
            onChange={(event) => setCoinsText(event.target.value)}
          />
          {fieldError === 'coins' && <span className="wb-coh-hint wb-coh-hint--warn">{errorMessage(save.error)}</span>}
        </div>
        <div className="wb-coh-field">
          <label className="wb-coh-label" htmlFor="wb-coh-rule-totals">Like counts while voting</label>
          <select
            id="wb-coh-rule-totals"
            className="wb-coh-input"
            value={draft.vote_totals}
            onChange={(event) => setDraft({ ...draft, vote_totals: event.target.value as AdminSettings['vote_totals'] })}
          >
            {query.data?.choices.vote_totals.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        </div>
      </div>
      {TOGGLES.map(({ key, label }) => (
        <label key={key} className="wb-coh-toggle">
          <input
            type="checkbox"
            checked={Boolean(draft[key])}
            onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })}
          />
          {label}
        </label>
      ))}
      {save.isError && !fieldError && <ErrorNotice error={save.error} />}
      {saved && <p className="wb-coh-success" role="status">Rules saved.</p>}
      <div className="wb-coh-actions">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save rules'}</Button>
      </div>
    </form>
  );
}

function ValuesEditor() {
  const query = useAdminValues();
  const save = useSaveAdminValue();
  const [adding, setAdding] = useState({ name: '', description: '' });

  if (query.isLoading) return <Loading label="Loading values" />;
  if (query.isError || !query.data) return <ErrorNotice error={query.error} onRetry={() => query.refetch()} />;
  const values = query.data.values;

  return (
    <section className="wb-coh-panel" aria-label="Code of Honor values">
      <h3 className="wb-coh-heading">Code of Honor</h3>
      <p className="wb-coh-muted">A value's key is permanent once acts use it; rename and reword freely.</p>
      {save.isError && <ErrorNotice error={save.error} />}
      <ul className="wb-coh-list">
        {values.map((value, index) => (
          <ValueRow
            key={value.key}
            value={value}
            first={index === 0}
            last={index === values.length - 1}
            busy={save.isPending}
            onSave={(changes) => save.mutate({ key: value.key, ...changes })}
            onMove={(delta) => {
              const other = values[index + delta];
              if (!other) return;
              save.mutate({ key: value.key, position: other.position });
              save.mutate({ key: other.key, position: value.position });
            }}
          />
        ))}
      </ul>
      <form
        className="wb-coh-form wb-coh-add"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ key: '', ...adding }, { onSuccess: () => setAdding({ name: '', description: '' }) });
        }}
      >
        <label className="wb-coh-label" htmlFor="wb-coh-new-name">Add a value</label>
        <input id="wb-coh-new-name" className="wb-coh-input" placeholder="Name" value={adding.name}
          onChange={(event) => setAdding({ ...adding, name: event.target.value })} />
        <textarea className="wb-coh-input" aria-label="Description" placeholder="What it means" value={adding.description}
          onChange={(event) => setAdding({ ...adding, description: event.target.value })} />
        <Button type="submit" disabled={save.isPending || !adding.name.trim()}>Add value</Button>
      </form>
    </section>
  );
}

function ValueRow({ value, first, last, busy, onSave, onMove }: {
  value: AdminValue;
  first: boolean;
  last: boolean;
  busy: boolean;
  onSave: (changes: Partial<AdminValue>) => void;
  onMove: (delta: number) => void;
}) {
  const [name, setName] = useState(value.name);
  const [description, setDescription] = useState(value.description);
  const dirty = name !== value.name || description !== value.description;

  return (
    <li className={value.is_active ? 'wb-coh-value' : 'wb-coh-value wb-coh-value--retired'}>
      <div className="wb-coh-value__fields">
        <input className="wb-coh-input" aria-label={`Name of ${value.key}`} value={name}
          onChange={(event) => setName(event.target.value)} />
        <textarea className="wb-coh-input" aria-label={`Description of ${value.key}`} value={description}
          onChange={(event) => setDescription(event.target.value)} />
        <span className="wb-coh-muted">key: {value.key}{!value.is_active && ' · retired'}</span>
      </div>
      <div className="wb-coh-actions">
        <Button type="button" variant="outline" size="sm" aria-label="Move up" disabled={first || busy} onClick={() => onMove(-1)}>↑</Button>
        <Button type="button" variant="outline" size="sm" aria-label="Move down" disabled={last || busy} onClick={() => onMove(1)}>↓</Button>
        {dirty && (
          <Button type="button" size="sm" disabled={busy || !name.trim()} onClick={() => onSave({ name, description })}>Save</Button>
        )}
        <Button type="button" variant={value.is_active ? 'destructive' : 'outline'} size="sm" disabled={busy}
          onClick={() => onSave({ is_active: !value.is_active })}>
          {value.is_active ? 'Retire' : 'Bring back'}
        </Button>
      </div>
    </li>
  );
}
