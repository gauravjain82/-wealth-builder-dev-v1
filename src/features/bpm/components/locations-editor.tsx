import { Button, FormRow, FormRowGroup, Input, Label, Select } from '@shared/components';
import { Trash2 } from 'lucide-react';
import type { BPMEventLocation, LocationKind } from '../types';
// The per-location check-in input is hidden, but the selected users are still
// held on the draft and submitted, so the type is still needed.
import type { SelectedUser } from './multi-user-select';
import { OfficePicker } from './office-picker';

/** One editable location row in the BPM form (mirrors BPMEventLocation for the UI). */
export interface LocationDraft {
  /** Present when editing an existing location; targets that row on save. */
  id?: number;
  kind: LocationKind;
  office: number | null;
  webinar_url: string;
  webinar_url_nickname: string;
  timezone: string;
  checkinUsers: SelectedUser[];
}

export const newLocationDraft = (): LocationDraft => ({
  kind: 'IN_PERSON',
  office: null,
  webinar_url: '',
  webinar_url_nickname: 'Zoom',
  timezone: '',
  checkinUsers: [],
});

/** Build editable drafts from an event's saved locations. */
export const locationsToDrafts = (locations: BPMEventLocation[]): LocationDraft[] =>
  locations
    .filter((location) => location.is_active)
    .map((location) => ({
      id: location.id,
      kind: location.kind,
      office: location.office,
      webinar_url: location.webinar_url,
      webinar_url_nickname: location.webinar_url_nickname || 'Zoom',
      timezone: location.timezone || '',
      checkinUsers: (location.checkin_permitted_users_detail || []).map((ref) => ({
        id: ref.id,
        label: ref.name || `User #${ref.id}`,
      })),
    }));

interface LocationsEditorProps {
  locations: LocationDraft[];
  onChange: (next: LocationDraft[]) => void;
}

export function LocationsEditor({ locations, onChange }: LocationsEditorProps) {
  const update = (index: number, patch: Partial<LocationDraft>) =>
    onChange(locations.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));

  const add = () => onChange([...locations, newLocationDraft()]);
  const remove = (index: number) => onChange(locations.filter((_, i) => i !== index));

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Locations *</Label>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          Add location
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
          Add at least one location — an office (in person) or an online room.
        </p>
      ) : null}

      {locations.map((location, index) => (
        <div
          key={location.id ?? `new-${index}`}
          className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-white/10"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
              Location {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Remove location"
              onClick={() => remove(index)}
            >
              <Trash2 size={14} />
            </Button>
          </div>

          <FormRowGroup>
            <FormRow>
              <Label>Type</Label>
              <Select
                variant="surface"
                value={location.kind}
                onChange={(e) => update(index, { kind: e.target.value as LocationKind })}
              >
                <option value="IN_PERSON">In person (office)</option>
                <option value="ONLINE">Online</option>
              </Select>
            </FormRow>
            <FormRow>
              <Label>Timezone override (optional)</Label>
              <Input
                variant="surface"
                value={location.timezone}
                onChange={(e) => update(index, { timezone: e.target.value })}
                placeholder="Defaults to the event timezone"
              />
            </FormRow>
          </FormRowGroup>

          {location.kind === 'IN_PERSON' ? (
            <FormRow>
              <Label>Office *</Label>
              <OfficePicker
                value={location.office}
                onChange={(officeId) => update(index, { office: officeId })}
              />
            </FormRow>
          ) : (
            <FormRowGroup>
              <FormRow>
                <Label>Join URL *</Label>
                <Input
                  variant="surface"
                  value={location.webinar_url}
                  onChange={(e) => update(index, { webinar_url: e.target.value })}
                  placeholder="https://zoom.us/j/…"
                />
              </FormRow>
              <FormRow>
                <Label>URL label</Label>
                <Input
                  variant="surface"
                  value={location.webinar_url_nickname}
                  onChange={(e) => update(index, { webinar_url_nickname: e.target.value })}
                />
              </FormRow>
            </FormRowGroup>
          )}

          {/* Per-location check-in allow-list is hidden: check-in is not gated
              on it today, so asking who may check people in here is noise
              (BPM v2 brief). Existing values are preserved and still submitted —
              only the input is hidden. */}
        </div>
      ))}
    </div>
  );
}
