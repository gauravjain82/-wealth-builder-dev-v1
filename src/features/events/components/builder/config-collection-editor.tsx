import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Checkbox,
  DateTimePicker,
  ErrorState,
  Input,
  Label,
  LoadingState,
  Select,
  Text,
  Textarea,
} from '@shared/components';
import { useToastStore } from '@/store';
import { useConfigList, type ConfigListApi } from '../../hooks/use-config-list';

/** Input kinds the schema-driven editor knows how to render and serialize. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'price'
  | 'select'
  | 'checkbox'
  | 'datetime'
  | 'stringList';

/** Declarative description of one editable field on a config row. */
export interface FieldSpec<T> {
  key: keyof T & string;
  label: string;
  type: FieldType;
  /** Options for `select` fields. */
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Empty `number`/`price`/`datetime` serialize to `null` when true. */
  nullable?: boolean;
  /** Grid span within the 2-column form (defaults to 1). */
  colSpan?: 1 | 2;
  help?: string;
}

type DraftValue = string | boolean | string[];
type Draft = Record<string, DraftValue>;

interface ConfigCollectionEditorProps<T extends { id: number }> {
  eventId: number;
  api: ConfigListApi<T>;
  fields: FieldSpec<T>[];
  /** Field whose value labels each existing row. */
  titleField: keyof T & string;
  /** Per-type defaults for a fresh row (overrides the built-in blank). */
  defaults?: Partial<Record<string, DraftValue>>;
  /** Singular noun used in buttons/toasts, e.g. "speaker". */
  itemNoun: string;
  description?: string;
}

/** Seed a draft from an existing item (or blanks for a new one). */
function seedDraft<T extends { id: number }>(
  fields: FieldSpec<T>[],
  item: T | null,
  defaults?: Partial<Record<string, DraftValue>>,
): Draft {
  const draft: Draft = {};
  for (const field of fields) {
    const raw = item ? (item[field.key] as unknown) : undefined;
    if (field.type === 'checkbox') {
      draft[field.key] = item ? Boolean(raw) : Boolean(defaults?.[field.key] ?? false);
    } else if (field.type === 'stringList') {
      draft[field.key] = Array.isArray(raw) ? raw.join('\n') : '';
    } else if (item) {
      draft[field.key] = raw === null || raw === undefined ? '' : String(raw);
    } else {
      draft[field.key] = (defaults?.[field.key] as DraftValue) ?? '';
    }
  }
  return draft;
}

/** Convert a draft into an API payload, coercing per field type. */
function toPayload<T extends { id: number }>(
  fields: FieldSpec<T>[],
  draft: Draft,
): Partial<T> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = draft[field.key];
    switch (field.type) {
      case 'checkbox':
        payload[field.key] = Boolean(value);
        break;
      case 'stringList':
        payload[field.key] = String(value)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        break;
      case 'number': {
        const str = String(value).trim();
        if (str === '') payload[field.key] = field.nullable ? null : 0;
        else payload[field.key] = Number(str);
        break;
      }
      case 'price': {
        const str = String(value).trim();
        payload[field.key] = str === '' ? (field.nullable ? null : '0') : str;
        break;
      }
      case 'datetime': {
        const str = String(value);
        payload[field.key] = str === '' ? (field.nullable ? null : str) : str;
        break;
      }
      default:
        payload[field.key] = String(value);
    }
  }
  return payload as Partial<T>;
}

/** One field's control, driven by its {@link FieldSpec.type}. */
function FieldControl<T extends { id: number }>({
  field,
  value,
  onChange,
}: {
  field: FieldSpec<T>;
  value: DraftValue;
  onChange: (v: DraftValue) => void;
}) {
  switch (field.type) {
    case 'textarea':
    case 'stringList':
      return (
        <Textarea
          rows={field.type === 'stringList' ? 3 : 4}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <Select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {field.help ?? field.label}
        </label>
      );
    case 'datetime':
      return (
        <DateTimePicker value={String(value)} onChange={(v) => onChange(v)} />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** Add/edit form for a single row (shared by the create and edit flows). */
function ItemForm<T extends { id: number }>({
  fields,
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  fields: FieldSpec<T>[];
  initial: Draft;
  busy: boolean;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const set = (key: string, value: DraftValue) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(draft);
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.key}
          className={`flex flex-col gap-1.5 ${field.colSpan === 2 ? 'sm:col-span-2' : ''}`}
        >
          {field.type !== 'checkbox' && <Label variant="form">{field.label}</Label>}
          <FieldControl field={field} value={draft[field.key]} onChange={(v) => set(field.key, v)} />
          {field.help && field.type !== 'checkbox' && (
            <Text variant="muted" className="text-xs">
              {field.help}
            </Text>
          )}
        </div>
      ))}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Schema-driven CRUD editor for a per-event config collection.
 *
 * Given a {@link FieldSpec} list and a `configService` resource group, it renders
 * the existing rows as editable cards plus an "Add" form — no bespoke UI per
 * resource. New config tabs declare a field schema and reuse this component (OCP).
 */
export function ConfigCollectionEditor<T extends { id: number }>({
  eventId,
  api,
  fields,
  titleField,
  defaults,
  itemNoun,
  description,
}: ConfigCollectionEditorProps<T>) {
  const { items, loading, error, busy, create, update, remove } = useConfigList<T>(eventId, api);
  const addToast = useToastStore((s) => s.addToast);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const notify = (message: string) => addToast({ type: 'success', message });
  const notifyError = (err: unknown) =>
    addToast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });

  const handleCreate = async (draft: Draft) => {
    try {
      await create(toPayload(fields, draft));
      setAdding(false);
      notify(`${itemNoun} added`);
    } catch (err) {
      notifyError(err);
    }
  };

  const handleUpdate = async (id: number, draft: Draft) => {
    try {
      await update(id, toPayload(fields, draft));
      setEditingId(null);
      notify(`${itemNoun} updated`);
    } catch (err) {
      notifyError(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      notify(`${itemNoun} removed`);
    } catch (err) {
      notifyError(err);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState description={error} />;

  return (
    <div className="space-y-4">
      {description && (
        <Text variant="muted" className="text-sm">
          {description}
        </Text>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
            >
              {isEditing ? (
                <ItemForm
                  fields={fields}
                  initial={seedDraft(fields, item, defaults)}
                  busy={busy}
                  submitLabel="Save"
                  onSubmit={(draft) => handleUpdate(item.id, draft)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {String(item[titleField] ?? '') || `Untitled ${itemNoun}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(item.id);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={busy}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && !adding && (
          <Text variant="muted" className="text-sm">
            No {itemNoun}s yet.
          </Text>
        )}
      </div>

      {adding ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 dark:border-white/15">
          <ItemForm
            fields={fields}
            initial={seedDraft(fields, null, defaults)}
            busy={busy}
            submitLabel={`Add ${itemNoun}`}
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
        >
          Add {itemNoun}
        </Button>
      )}
    </div>
  );
}
