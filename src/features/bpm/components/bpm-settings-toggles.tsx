import { useEffect, useState } from 'react';
import { Checkbox, Input, Label } from '@shared/components';
import { useToastStore } from '@/store';
import { bpmService } from '../services/bpm-service';
import type { BPMSettings, BPMSettingsPayload } from '../types';

/**
 * The BPM feature switches.
 *
 * Each control saves on change rather than behind a Save button: these are
 * independent switches, not a form, and a half-filled settings page has no
 * meaning worth protecting. A failed write reverts the control it came from, so
 * what is on screen is always what the server holds.
 *
 * One group here is still not what it looks like, and says so in its own help
 * text rather than being hidden: **Download attachments** hides a control and
 * nothing more (**D11**). The files live on a permanent CDN URL, which is what
 * keeps a flyer free to render on every Overview visit, and that URL is reachable
 * by anyone who opens devtools. Only *view* is a real gate.
 *
 * Two groups that *were* inert now drive something: **Text / email event to
 * guests** gained their sender (**D5** reopened), and **Host scans a guest pass**
 * gained its direction (**D8** reopened). The guest switch is the one control here
 * that defaults **off** on the server, and the help text says why: it is the only
 * BPM code that is sent out of the building.
 */

interface ToggleRow {
  field: keyof BPMSettingsPayload;
  label: string;
  help: string;
}

const ATTACHMENT_TOGGLES: ToggleRow[] = [
  {
    field: 'attachments_view',
    label: 'View attachments',
    help: 'Off removes the file URL from every response, so attachments never reach the browser at all.',
  },
  {
    field: 'attachments_download',
    label: 'Download attachments',
    help: 'Hides the download control. Attachments are served from a public CDN URL, so this does not make the file unreachable — switch viewing off for that.',
  },
];

const QR_TOGGLES: ToggleRow[] = [
  {
    field: 'qr_associate_to_host',
    label: 'Associate scans the event QR',
    help: 'An associate checks themselves in by scanning the code shown at the door.',
  },
  {
    field: 'qr_host_to_associate',
    label: 'Host scans an associate QR',
    help: "Somebody working the door checks an associate in from that person's own code.",
  },
  {
    field: 'qr_host_to_guest',
    label: 'Host scans a guest pass',
    help: "Somebody working the door checks a guest in from the pass they were emailed or texted. Off unless you turn it on — a guest pass is the one code that leaves the building. Add {{ guest_pass_url }} to a guest template to send one.",
  },
];

const MESSAGING_TOGGLES: ToggleRow[] = [
  {
    field: 'text_event_to_guests',
    label: 'Text the event to guests',
    help: 'Allows the Send button on the guest list to text chosen guests. There is no opt-out handling, so keep bodies to people who asked to hear from somebody.',
  },
  {
    field: 'email_event_to_guests',
    label: 'Email the event to guests',
    help: 'Allows the Send button on the guest list to email chosen guests.',
  },
];

interface BpmSettingsTogglesProps {
  settings: BPMSettings;
  /** Called with the server's answer after every successful save. */
  onSaved: (settings: BPMSettings) => void;
}

export function BpmSettingsToggles({ settings, onSaved }: BpmSettingsTogglesProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [saving, setSaving] = useState<string | null>(null);
  // The hours box is free text while it is being typed, so it needs local
  // state; every other control is driven straight off the server's answer.
  const [hours, setHours] = useState(String(settings.checkin_window_hours));

  useEffect(() => {
    setHours(String(settings.checkin_window_hours));
  }, [settings.checkin_window_hours]);

  const save = async (patch: BPMSettingsPayload, field: string) => {
    setSaving(field);
    try {
      onSaved(await bpmService.updateSettings(patch));
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save setting',
      });
      // Every control is driven off the prop, so a fresh object identity is
      // enough to force the failed one back to what the server still holds.
      onSaved({ ...settings });
    } finally {
      setSaving(null);
    }
  };

  const renderGroup = (title: string, rows: ToggleRow[]) => (
    <div className="mb-5 last:mb-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
        {title}
      </h3>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.field} className="flex items-start gap-3">
            <Checkbox
              id={`bpm-setting-${row.field}`}
              checked={Boolean(settings[row.field as keyof BPMSettings])}
              disabled={saving === row.field}
              onChange={(e) => void save({ [row.field]: e.target.checked }, row.field)}
            />
            <div className="min-w-0">
              <Label htmlFor={`bpm-setting-${row.field}`}>{row.label}</Label>
              <p className="text-xs text-slate-500 dark:text-white/60">{row.help}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
          Check-in window
        </h3>
        <div className="flex items-start gap-3">
          <Checkbox
            id="bpm-setting-checkin-window"
            checked={settings.checkin_window_enabled}
            disabled={saving === 'checkin_window_enabled'}
            onChange={(e) =>
              void save({ checkin_window_enabled: e.target.checked }, 'checkin_window_enabled')
            }
          />
          <div className="min-w-0 flex-1">
            <Label htmlFor="bpm-setting-checkin-window">Hold check-in until shortly before the BPM</Label>
            <p className="mb-2 text-xs text-slate-500 dark:text-white/60">
              Stops somebody checking people into next week&apos;s date by mistake. The window
              only opens — it never closes again, so a name typed wrong at the door can still
              be fixed the next morning.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={168}
                className="w-24"
                value={hours}
                disabled={!settings.checkin_window_enabled || saving === 'checkin_window_hours'}
                onChange={(e) => setHours(e.target.value)}
                onBlur={() => {
                  const parsed = Number(hours);
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    setHours(String(settings.checkin_window_hours));
                    return;
                  }
                  if (parsed === settings.checkin_window_hours) return;
                  void save({ checkin_window_hours: Math.round(parsed) }, 'checkin_window_hours');
                }}
                aria-label="Hours before the BPM that check-in opens"
              />
              <span className="text-sm text-slate-600 dark:text-white/70">
                hours before the BPM starts
              </span>
            </div>
          </div>
        </div>
      </div>

      {renderGroup('Attachments', ATTACHMENT_TOGGLES)}
      {renderGroup('QR check-in', QR_TOGGLES)}
      {renderGroup('Send the event to guests', MESSAGING_TOGGLES)}

      {settings.updated_by_name ? (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/10 dark:text-white/40">
          Last changed by {settings.updated_by_name}.
        </p>
      ) : null}
    </div>
  );
}
