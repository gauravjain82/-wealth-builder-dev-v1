import { useCallback, useState } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Label,
  Textarea,
  UserAutocompleteDropdown,
  type UserAutocompleteOption,
} from '@shared/components';
import { useToastStore } from '@/store';
import { AddProspectModal } from '@/features/team/prospect/components/add-prospect-modal';
import { createProspect } from '@/features/team/prospect/services/prospect-service';
import { defaultAddProspectForm, type AddProspectFormData } from '@/features/team/prospect/types';
import { bpmService } from '../services/bpm-service';
import type { BPMOccurrence } from '../types';

interface AddGuestFormProps {
  occurrence: BPMOccurrence | null;
  onAdded: () => void;
}

interface GuestForm {
  prospectId: number | null;
  prospectLabel: string;
  prospectMeta: string;
  inviterId: number | null;
  inviterLabel: string;
  notes: string;
}

/** Resolve the logged-in user to auto-select as the inviter. */
function getLoggedInUser(): { id: number | null; name: string } {
  let id: number | null = null;
  let name = '';

  const rawUser = localStorage.getItem('authUser');
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as {
        id?: unknown;
        name?: string;
        full_name?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
      };
      const parsedId = Number.parseInt(String(parsed?.id ?? ''), 10);
      if (Number.isFinite(parsedId)) id = parsedId;
      name =
        parsed?.name ||
        parsed?.full_name ||
        `${parsed?.first_name || ''} ${parsed?.last_name || ''}`.trim() ||
        parsed?.email ||
        '';
    } catch {
      // Ignore malformed local storage and fall back to wb.* keys.
    }
  }

  if (id === null) {
    const storedId = localStorage.getItem('wb.userId');
    if (storedId) id = Number(storedId);
  }
  if (!name) name = localStorage.getItem('wb.name') || '';

  return { id, name };
}

function defaultForm(): GuestForm {
  const inviter = getLoggedInUser();
  return {
    prospectId: null,
    prospectLabel: '',
    prospectMeta: '',
    inviterId: inviter.id,
    inviterLabel: inviter.name,
    notes: '',
  };
}

/** Split a free-text name into first/last for prefilling the new-prospect form. */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Map the Add Prospect form to the createProspect payload (mirrors the prospect tracker page). */
function formToCreatePayload(formData: AddProspectFormData) {
  return {
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    recruited_by: formData.recruiterId,
    leader: formData.leaderId,
    profile: {
      state: formData.state || undefined,
      home_address: formData.homeAddress || undefined,
      home_address2: formData.homeAddress2.trim(),
      home_city: formData.homeCity || undefined,
      home_zip: formData.homeZip || undefined,
      birthday: formData.birthday || null,
      gender: formData.gender || undefined,
      occupation: formData.occupation || undefined,
      how_known: formData.howKnown || undefined,
      what_told: formData.whatTold || undefined,
      relationship: formData.relationship ? Number(formData.relationship) : null,
      dependent_children: formData.dependentKids,
      flags: {
        age25Plus: formData.age25Plus,
        homeowner: formData.homeowner,
        solidCareer: formData.solidCareer,
        income75kPlus: formData.income75kPlus,
        dissatisfied: formData.dissatisfied,
        entrepreneurial: formData.entrepreneurial,
        spanishPreferred: formData.spanishPreferred,
        married: formData.married,
        dependentKids: formData.dependentKids,
        language: formData.language,
      },
    },
    prospect_meta: { outcome: 'Both', mark: 'default', hot: false, top25: false },
  };
}

export function AddGuestForm({ occurrence, onAdded }: AddGuestFormProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [form, setForm] = useState<GuestForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [creatingProspect, setCreatingProspect] = useState(false);
  const [prospectInitialForm, setProspectInitialForm] = useState<AddProspectFormData | null>(null);

  const searchInviters = useCallback(async (search: string): Promise<UserAutocompleteOption[]> => {
    const rows = await bpmService.searchInviters(search);
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      agencyCode: row.agency_code || '',
      meta: [row.agency_code, row.phone].filter(Boolean).join(' | '),
    }));
  }, []);

  const searchGuests = useCallback(
    async (search: string): Promise<UserAutocompleteOption[]> => {
      if (!form.inviterId) return [];
      const rows = await bpmService.searchGuests(form.inviterId, search);
      return rows.map((row) => ({
        id: row.id,
        label: row.name || `Prospect #${row.id}`,
        meta: [row.phone, row.email].filter(Boolean).join(' | '),
      }));
    },
    [form.inviterId],
  );

  const openAddProspect = (typedName: string) => {
    if (!form.inviterId) {
      addToast({ type: 'error', message: 'Select an inviter first.' });
      return;
    }
    const { firstName, lastName } = splitName(typedName);
    setProspectInitialForm({
      ...defaultAddProspectForm,
      firstName,
      lastName,
      recruiter: form.inviterLabel,
      recruiterId: form.inviterId,
    });
    setAddProspectOpen(true);
  };

  const handleCreateProspect = async (formData: AddProspectFormData) => {
    if (!form.inviterId) {
      addToast({ type: 'error', message: 'Select an inviter first.' });
      return;
    }
    setCreatingProspect(true);
    try {
      // Recruiter is always the selected inviter, even if the modal field was changed.
      const created = await createProspect(
        formToCreatePayload({
          ...formData,
          recruiter: form.inviterLabel,
          recruiterId: form.inviterId,
        }),
        // The inviter is chosen from the company-wide picker, so it may sit
        // outside the caller's downline; flag the reception context to bypass
        // the generic create endpoint's scope check.
        { bpmGuest: true },
      );
      const label =
        created.full_name || `${created.first_name} ${created.last_name}`.trim() || created.email || `Prospect #${created.id}`;
      setForm((prev) => ({
        ...prev,
        prospectId: created.id,
        prospectLabel: label,
        prospectMeta: [created.phone, created.email].filter(Boolean).join(' | '),
      }));
      setAddProspectOpen(false);
      addToast({ type: 'success', message: 'Prospect created and selected.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add prospect' });
    } finally {
      setCreatingProspect(false);
    }
  };

  const submit = async () => {
    if (!occurrence) {
      addToast({ type: 'error', message: 'Select a BPM and date first.' });
      return;
    }
    if (!form.inviterId) {
      addToast({ type: 'error', message: 'Select an inviter first.' });
      return;
    }
    if (!form.prospectId) {
      addToast({ type: 'error', message: 'Select a prospect for the guest.' });
      return;
    }
    setSaving(true);
    try {
      await bpmService.addGuest(occurrence.id, {
        guest_name: form.prospectLabel,
        prospect: form.prospectId,
        inviter: form.inviterId,
        notes: form.notes,
      });
      addToast({ type: 'success', message: 'Guest added.' });
      setForm(defaultForm());
      onAdded();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add guest' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormRowGroup>
          <FormRow>
            <Label>Inviter *</Label>
            <UserAutocompleteDropdown
              selectedId={form.inviterId}
              selectedLabel={form.inviterLabel}
              placeholder="Search the organisation"
              fetchOptions={searchInviters}
              onSelect={(option) =>
                setForm((prev) => {
                  const inviterChanged = prev.inviterId !== option.id;
                  return {
                    ...prev,
                    inviterId: option.id,
                    inviterLabel: option.label,
                    prospectId: inviterChanged ? null : prev.prospectId,
                    prospectLabel: inviterChanged ? '' : prev.prospectLabel,
                    prospectMeta: inviterChanged ? '' : prev.prospectMeta,
                  };
                })
              }
            />
          </FormRow>
          <FormRow>
            <Label>Guest (Prospect) *</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <UserAutocompleteDropdown
                  selectedId={form.prospectId}
                  selectedLabel={form.prospectLabel}
                  placeholder={form.inviterId ? 'Search prospects in this baseshop' : 'Select an inviter first'}
                  buttonText="SELECT"
                  disabled={!form.inviterId}
                  fetchOptions={searchGuests}
                  onSelect={(option) =>
                    setForm((prev) => ({
                      ...prev,
                      prospectId: option.id,
                      prospectLabel: option.label,
                      prospectMeta: option.meta || '',
                    }))
                  }
                  onNoResultsAction={openAddProspect}
                  noResultsActionLabel="+ Add new prospect"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!form.inviterId}
                onClick={() => openAddProspect('')}
              >
                + Add
              </Button>
            </div>
            {form.prospectMeta ? (
              <span className="mt-1 text-xs text-slate-500 dark:text-white/60">{form.prospectMeta}</span>
            ) : null}
          </FormRow>
        </FormRowGroup>
        <FormRow>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
        </FormRow>
        <FormActions>
          <Button type="submit" disabled={saving || !occurrence}>
            {saving ? 'Adding…' : 'Add Guest'}
          </Button>
        </FormActions>
      </Form>

      <AddProspectModal
        open={addProspectOpen}
        saving={creatingProspect}
        title="Add Prospect"
        submitLabel="Create & Select"
        initialForm={prospectInitialForm}
        onClose={() => setAddProspectOpen(false)}
        onSubmit={handleCreateProspect}
      />
    </>
  );
}
