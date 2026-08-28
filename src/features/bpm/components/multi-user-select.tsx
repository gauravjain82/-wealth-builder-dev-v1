import { UserAutocompleteDropdown, type UserAutocompleteOption } from '@shared/components';
import { X } from 'lucide-react';

export interface SelectedUser {
  id: number;
  label: string;
}

interface MultiUserSelectProps {
  selected: SelectedUser[];
  onChange: (users: SelectedUser[]) => void;
  placeholder?: string;
}

export function MultiUserSelect({ selected, onChange, placeholder = 'Search users' }: MultiUserSelectProps) {
  const add = (option: UserAutocompleteOption) => {
    if (selected.some((user) => user.id === option.id)) return;
    onChange([...selected, { id: option.id, label: option.label }]);
  };

  const remove = (id: number) => onChange(selected.filter((user) => user.id !== id));

  return (
    <div className="grid gap-2">
      <UserAutocompleteDropdown
        selectedId={null}
        selectedLabel=""
        placeholder={placeholder}
        fetchFromApi
        buttonText="ADD"
        onSelect={add}
      />
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-white/80"
            >
              {user.label}
              <button type="button" aria-label={`Remove ${user.label}`} onClick={() => remove(user.id)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
