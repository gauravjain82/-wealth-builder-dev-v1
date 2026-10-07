import { useState } from 'react';
import { Button, Checkbox, FormRow, FormRowGroup, Input, Label, Text } from '@shared/components';
import { usePeopleSearch } from '../hooks/use-people-search';
import type { PersonSearchHit } from '../types/ticket';
import { EMPTY_RECIPIENT, type RecipientDraft } from '../utils/recipient-draft';

interface TicketRecipientPickerProps {
  eventId: number | undefined;
  value: RecipientDraft;
  onChange: (next: RecipientDraft) => void;
  /** Called when a person is picked or cleared, so the SMD can follow them. */
  onPick?: (person: PersonSearchHit | null) => void;
  /** The SMD currently chosen, named in the "joins … team" note. */
  sellerName?: string | null;
}

/**
 * "Who is this ticket going to?" for managers. Find an agent or prospect by name,
 * agency code, email or phone; or type someone new, who is added as a prospect
 * on the chosen SMD's team. Agents are shown read-only — their details are never
 * changed from here; a prospect's details can be corrected.
 */
export function TicketRecipientPicker({ eventId, value, onChange, onPick, sellerName }: TicketRecipientPickerProps) {
  const [text, setText] = useState('');
  const search = usePeopleSearch(eventId, text, !value.person);
  const set = (patch: Partial<RecipientDraft>) => onChange({ ...value, ...patch });

  const pick = (person: PersonSearchHit) => {
    onChange({
      ...value,
      person,
      firstName: person.kind === 'prospect' ? person.first_name : '',
      lastName: person.kind === 'prospect' ? person.last_name : '',
      email: person.kind === 'prospect' ? person.email : '',
      phone: person.kind === 'prospect' ? person.phone : '',
    });
    onPick?.(person);
  };
  const clear = () => {
    onChange(EMPTY_RECIPIENT);
    onPick?.(null);
  };

  const { person } = value;
  if (person) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Text className="font-semibold">
              {person.full_name}
              {person.agency_code ? <span className="font-normal text-slate-500"> · {person.agency_code}</span> : null}
            </Text>
            <Text variant="muted" className="text-xs">
              {person.kind === 'agent' ? 'Agent' : 'Prospect'}
              {person.upline_seller ? ` · SMD ${person.upline_seller.display_name}` : ''}
            </Text>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            Change
          </Button>
        </div>
        {person.kind === 'agent' ? (
          <>
            <Text variant="muted" className="text-sm">
              {[person.email, person.phone].filter(Boolean).join(' · ') || 'No contact details on file'}
              <span className="block text-xs">An agent's details can't be changed here.</span>
            </Text>
            {!person.has_email ? (
              <FormRow>
                <Label variant="form">Email to send the ticket to</Label>
                <Input type="email" required value={value.email} onChange={(e) => set({ email: e.target.value })} />
              </FormRow>
            ) : null}
          </>
        ) : (
          <>
            <ContactFields value={value} set={set} />
            <Text variant="muted" className="text-xs">
              Changes are saved to their prospect record.
            </Text>
          </>
        )}
      </div>
    );
  }

  const rows = search.data?.rows ?? [];
  return (
    <div className="space-y-3">
      <FormRow>
        <Label variant="form" htmlFor="ticket-recipient-search">
          Find the person
        </Label>
        <Input
          id="ticket-recipient-search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Name, agency code, email or phone"
          autoComplete="off"
        />
      </FormRow>
      {text.trim().length >= 2 ? (
        <div
          className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10"
          role="listbox"
          aria-label="Matching people"
        >
          {search.isFetching && !search.data ? <Text variant="muted" className="p-3 text-sm">Searching…</Text> : null}
          {search.isError ? <Text className="p-3 text-sm text-red-600">Search failed.</Text> : null}
          {search.data && rows.length === 0 ? (
            <Text variant="muted" className="p-3 text-sm">
              Nobody found — enter their details below.
            </Text>
          ) : null}
          {rows.map((hit) => (
            <button
              key={hit.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => pick(hit)}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
            >
              <span className="min-w-0">
                <span className="font-medium">{hit.full_name}</span>
                {hit.agency_code ? <span className="text-slate-500"> · {hit.agency_code}</span> : null}
                <span className="block truncate text-xs text-slate-500">
                  {[hit.email, hit.phone].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-slate-500">
                {hit.kind === 'agent' ? 'Agent' : 'Prospect'}
                {hit.upline_seller ? <span className="block">SMD {hit.upline_seller.display_name}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-3 dark:border-white/15">
        <Text className="text-sm font-medium">Not in Wealth Builders? Enter their details</Text>
        <ContactFields value={value} set={set} />
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-white/80">
          <Checkbox checked={value.createProspect} onChange={(e) => set({ createProspect: e.target.checked })} />
          <span>
            Add them as a prospect
            <span className="block text-xs text-slate-500">
              {sellerName ? `They join ${sellerName}'s team.` : 'They join the team of the SMD you choose below.'} If the
              email or phone already belongs to someone, that person is used instead.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function ContactFields({ value, set }: { value: RecipientDraft; set: (patch: Partial<RecipientDraft>) => void }) {
  return (
    <FormRowGroup columns={2}>
      <FormRow>
        <Label variant="form">First name</Label>
        <Input required value={value.firstName} onChange={(e) => set({ firstName: e.target.value })} />
      </FormRow>
      <FormRow>
        <Label variant="form">Last name</Label>
        <Input value={value.lastName} onChange={(e) => set({ lastName: e.target.value })} />
      </FormRow>
      <FormRow>
        <Label variant="form">Email</Label>
        <Input type="email" required value={value.email} onChange={(e) => set({ email: e.target.value })} />
      </FormRow>
      <FormRow>
        <Label variant="form">Phone</Label>
        <Input value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Optional" />
      </FormRow>
    </FormRowGroup>
  );
}
