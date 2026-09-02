import { CONTENT_ROLES } from '../types';

type RoleAccessPickerProps = {
  value: string[];
  onChange: (roles: string[]) => void;
  label?: string;
  hint?: string;
  roles?: readonly string[];
  disabled?: boolean;
};

export function RoleAccessPicker({
  value,
  onChange,
  label = 'Who can see this?',
  hint = 'Leave empty to allow all roles that can access the parent section.',
  roles = CONTENT_ROLES,
  disabled,
}: RoleAccessPickerProps) {
  const toggleRole = (role: string) => {
    if (disabled) return;
    if (value.includes(role)) {
      onChange(value.filter((entry) => entry !== role));
      return;
    }
    onChange([...value, role]);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-white/60">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const selected = value.includes(role);
          return (
            <button
              key={role}
              type="button"
              disabled={disabled}
              onClick={() => toggleRole(role)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-50 ${
                selected
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-white/20 dark:text-white/70'
              }`}
            >
              {role}
            </button>
          );
        })}
      </div>
    </div>
  );
}
