/**
 * Teammate search as an ARIA combobox: type two or more characters (debounced), move
 * with the arrow keys, choose with Enter. Superseded searches are aborted by React
 * Query, so a slow answer for "pr" can never overwrite the list for "pri".
 */

import { useEffect, useId, useState } from 'react';

import { useMemberSearch } from '../hooks/use-code-of-honor';
import type { MemberOption } from '../types';
import { Avatar } from './avatar';

const DEBOUNCE_MS = 250;

interface MemberPickerProps {
  value: MemberOption | null;
  onChange: (member: MemberOption | null) => void;
  label?: string;
}

export function MemberPicker({ value, onChange, label = 'Who are you recognizing?' }: MemberPickerProps) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const search = useMemberSearch(query);
  const options = query.trim().length >= 2 ? (search.data?.members ?? []) : [];

  const choose = (member: MemberOption) => {
    onChange(member);
    setInput('');
    setQuery('');
    setOpen(false);
  };

  if (value) {
    return (
      <div className="wb-coh-field">
        <span className="wb-coh-label">{label}</span>
        <div className="wb-coh-chosen">
          <Avatar name={value.name} initials={value.initials} photoUrl={value.photo_url} />
          <span>{value.name}</span>
          <button type="button" className="wb-coh-link" onClick={() => onChange(null)}>
            Change
          </button>
        </div>
      </div>
    );
  }

  const showList = open && query.trim().length >= 2;
  return (
    <div className="wb-coh-field wb-coh-combobox">
      <label className="wb-coh-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="wb-coh-input"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && options[active] ? `${listId}-${options[active].id}` : undefined}
        placeholder="Type a teammate's name"
        value={input}
        onChange={(event) => {
          setInput(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, options.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && options[active]) {
            event.preventDefault();
            choose(options[active]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="wb-coh-options">
          {search.isFetching && options.length === 0 && <li className="wb-coh-option--note">Searching…</li>}
          {search.isError && <li className="wb-coh-option--note">Search failed. Keep typing to retry.</li>}
          {!search.isFetching && !search.isError && options.length === 0 && (
            <li className="wb-coh-option--note">No teammate found</li>
          )}
          {options.map((member, index) => (
            <li
              key={member.id}
              id={`${listId}-${member.id}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'wb-coh-option wb-coh-option--active' : 'wb-coh-option'}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(member);
              }}
            >
              <Avatar name={member.name} initials={member.initials} photoUrl={member.photo_url} />
              {member.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
