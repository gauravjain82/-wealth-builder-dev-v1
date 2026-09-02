import { Input, Select, Textarea } from '@/shared/components';
import type { ContentFieldSchema, FieldValue } from '../types';

type SchemaFieldProps = {
  field: ContentFieldSchema;
  value: FieldValue;
  onChange: (name: string, value: FieldValue) => void;
};

/** Renders one page-specific form field from its schema entry. */
export function SchemaField({ field, value, onChange }: SchemaFieldProps) {
  if (field.kind === 'checkbox') {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
          {field.label}
        </label>
        {field.hint && <p className="mt-1 text-xs text-white/50">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{field.label}</label>

      {field.kind === 'text' && (
        <Input
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      )}

      {field.kind === 'number' && (
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={String(value ?? '')}
          onChange={(event) =>
            onChange(field.name, event.target.value === '' ? '' : Number(event.target.value))
          }
        />
      )}

      {field.kind === 'textarea' && (
        <Textarea
          rows={field.rows ?? 3}
          value={String(value ?? '')}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      )}

      {field.kind === 'select' && (
        <Select
          value={String(value ?? '')}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}

      {field.hint && <p className="mt-1 text-xs text-white/50">{field.hint}</p>}
    </div>
  );
}
