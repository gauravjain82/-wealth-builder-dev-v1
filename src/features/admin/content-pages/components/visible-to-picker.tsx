import { useState, type ReactNode } from 'react';
import type { RoleOption } from '../types';
import {
  DEFAULT_ROLE_OPTIONS,
  VISIBLE_TO_PRESETS,
  matchVisibleToPreset,
} from '../utils/visible-to';

type VisibleToPickerProps = {
  /** Selected role names. Empty means everyone. */
  value: string[];
  onChange: (roles: string[]) => void;
  /** Roles offered under "Custom…". Defaults to the built-in content roles. */
  roleOptions?: RoleOption[];
  label?: string;
  /** Extra guidance under the presets, e.g. the "tool must be visible too" rule. */
  note?: ReactNode;
  disabled?: boolean;
};

/**
 * "Visible to" control: rank presets ("Broker and up") with a Custom role
 * checklist as the escape hatch.
 *
 * Existing role lists open on the matching preset, or on Custom when they
 * match none.
 */
export function VisibleToPicker({
  value,
  onChange,
  roleOptions = DEFAULT_ROLE_OPTIONS,
  label = 'Visible to',
  note,
  disabled,
}: VisibleToPickerProps) {
  const [forceCustom, setForceCustom] = useState(false);
  const preset = matchVisibleToPreset(value);
  const customMode = forceCustom || !preset;

  const choose = (roles: string[]) => {
    setForceCustom(false);
    onChange(roles);
  };

  const toggleRole = (role: string) => {
    onChange(value.includes(role) ? value.filter((entry) => entry !== role) : [...value, role]);
  };

  const pillClass = (selected: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-50 ${
      selected
        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
        : 'border-white/20 text-white/70 hover:border-white/40'
    }`;

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-white">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {VISIBLE_TO_PRESETS.map((option) => {
          const selected = !customMode && preset?.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={pillClass(selected)}
              onClick={() => choose(option.roles)}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={customMode}
          className={pillClass(customMode)}
          onClick={() => setForceCustom(true)}
        >
          Custom…
        </button>
      </div>

      {customMode && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs text-white/60">
            Tick each role that should see this. Nothing ticked means everyone.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {roleOptions.map((role) => (
              <label key={role.name} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={value.includes(role.name)}
                  onChange={() => toggleRole(role.name)}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {note && <p className="text-xs text-white/60">{note}</p>}
    </fieldset>
  );
}
