import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, LoadingState, Modal, Select, Text } from '@shared/components';
import { bpmService } from '../services/bpm-service';
import { useBpmConfig } from '../context/bpm-config-context';
import type {
  BPMEmailTemplate,
  BPMGuest,
  BPMGuestMessageSummary,
  BPMSendChannel,
  BPMSendReport,
  BPMSmsTemplate,
} from '../types';

interface SendEventModalProps {
  open: boolean;
  onClose: () => void;
  occurrenceId: number | null;
  /** The guests the sender ticked. Never derived here — see below. */
  guests: BPMGuest[];
  /** Reload the list so the contact badges reflect what was just sent. */
  onSent?: () => void;
}

/**
 * The placeholder that puts a scannable door pass in a guest's message.
 *
 * Checked against the template body so the modal can say, before anything is
 * sent, whether these guests will get a pass. Without that the only way to find
 * out is to look in somebody's inbox afterwards — and a host who switched guest
 * scanning on will reasonably assume it happens by itself.
 */
const PASS_PLACEHOLDER = 'guest_pass_url';

/** Human label for an outcome status. */
const STATUS_LABEL: Record<BPMSendReport['outcomes'][number]['status'], string> = {
  queued: 'Queued',
  sent: 'Sent',
  skipped: 'Skipped',
  failed: 'Failed',
};

/**
 * Send this BPM date's details to the guests the sender ticked.
 *
 * **The recipient list is passed in, never derived here.** The page decides:
 * ticking nothing targets everyone on screen, so chasing a whole list is one
 * click rather than select-all-then-send. What makes that safe is that this modal
 * is a *confirmation* — it names who is about to be written to and what each of
 * them has already had. The server still requires explicit ids, so there is no
 * "send to everyone on this date" shorthand it could be asked for by mistake.
 *
 * **Prior contact is shown before anything is sent.** Without it nobody can tell
 * they are about to message somebody for the third time, which is how a guest
 * ends up with three texts. It comes off the guest rows already loaded, so this
 * costs no request.
 *
 * **Templates are picked here rather than assigned to the BPM.** The per-stage
 * assignment fields are hidden on the BPM form, so a picker is the only way this
 * is reachable today; the server still falls back to an assignment when one
 * exists. Picking at send time is also closer to the act — a host chasing people
 * chooses what to say to them.
 *
 * Everything is fetched on open, because `Modal` unmounts its children.
 */
/**
 * Whether the chosen template will carry a door pass, said plainly.
 *
 * Two different problems, deliberately separated: a template with no placeholder
 * sends no pass, and a pass sent while the direction is switched off is a code
 * nobody at the door can scan. A host can hit either one without noticing.
 */
function PassHint({
  body,
  scanningEnabled,
}: {
  /** The selected template's body, or null when the BPM's assignment is used. */
  body: string | null;
  scanningEnabled: boolean;
}) {
  if (body === null) return null;
  if (!body.includes(PASS_PLACEHOLDER)) {
    return (
      <Text variant="muted" className="mt-1 text-xs">
        No door pass in this template. Add {'{{ guest_pass_url }}'} to it if you want
        guests to be scanned in at the door.
      </Text>
    );
  }
  if (!scanningEnabled) {
    return (
      <Text className="mt-1 text-xs text-amber-700 dark:text-amber-200">
        This sends each guest a pass, but scanning guest passes is switched off in BPM
        Settings, so nobody at the door can use one yet.
      </Text>
    );
  }
  return (
    <Text variant="muted" className="mt-1 text-xs">
      Includes each guest&rsquo;s own door pass.
    </Text>
  );
}

export function SendEventModal({
  open,
  onClose,
  occurrenceId,
  guests,
  onSent,
}: SendEventModalProps) {
  const { settings } = useBpmConfig();
  // Permissive default while the config is in flight, matching the rest of BPM —
  // the server is the gate that matters, and it names the switch in its refusal.
  const emailAllowed = settings?.email_event_to_guests ?? false;
  const smsAllowed = settings?.text_event_to_guests ?? false;
  const guestScanningEnabled = settings?.qr_host_to_guest ?? false;

  const [emailTemplates, setEmailTemplates] = useState<BPMEmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<BPMSmsTemplate[]>([]);
  const [emailTemplateId, setEmailTemplateId] = useState('');
  const [smsTemplateId, setSmsTemplateId] = useState('');
  const [channels, setChannels] = useState<BPMSendChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BPMSendReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    // Default to whatever the business has actually switched on, so the common
    // case is one click.
    setChannels(emailAllowed ? ['email'] : smsAllowed ? ['sms'] : []);
    const [emails, texts] = await Promise.allSettled([
      bpmService.emailTemplates(),
      bpmService.smsTemplates(),
    ]);
    if (emails.status === 'fulfilled') {
      const active = emails.value.results.filter((template) => template.is_active);
      setEmailTemplates(active);
      setEmailTemplateId(active[0] ? String(active[0].id) : '');
    }
    if (texts.status === 'fulfilled') {
      const active = texts.value.results.filter((template) => template.is_active);
      setSmsTemplates(active);
      setSmsTemplateId(active[0] ? String(active[0].id) : '');
    }
    setLoading(false);
  }, [emailAllowed, smsAllowed]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const toggleChannel = (channel: BPMSendChannel) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((entry) => entry !== channel)
        : [...current, channel],
    );
  };

  /**
   * Recipients who have already heard from somebody about this BPM.
   *
   * Read off `messages_summary`, which the guest list already carries — the whole
   * reason that field is on the row rather than behind a request.
   */
  const alreadyContacted = useMemo(
    () =>
      guests
        .map((guest) => ({ guest, summary: guest.messages_summary }))
        .filter(
          (entry): entry is { guest: BPMGuest; summary: BPMGuestMessageSummary } =>
            Boolean(entry.summary && entry.summary.email + entry.summary.sms > 0),
        ),
    [guests],
  );

  const selectedSms = useMemo(
    () => smsTemplates.find((template) => String(template.id) === smsTemplateId),
    [smsTemplates, smsTemplateId],
  );

  const selectedEmail = useMemo(
    () => emailTemplates.find((template) => String(template.id) === emailTemplateId),
    [emailTemplates, emailTemplateId],
  );

  const send = async () => {
    if (!occurrenceId || channels.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bpmService.sendEventToGuests(occurrenceId, {
          guest_ids: guests.map((guest) => guest.id),
          channels,
          email_template_id: channels.includes('email')
            ? Number(emailTemplateId) || null
            : null,
          sms_template_id: channels.includes('sms') ? Number(smsTemplateId) || null : null,
      });
      setReport(result);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  const neitherChannelAvailable = !emailAllowed && !smsAllowed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send event to ${guests.length} guest${guests.length === 1 ? '' : 's'}`}
      contentClassName="max-w-[620px]"
    >
      {loading ? (
        <LoadingState />
      ) : report ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.counts).map(([status, count]) => (
              <span
                key={status}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-white/80"
              >
                {STATUS_LABEL[status as keyof typeof STATUS_LABEL] || status}: {count}
              </span>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {report.outcomes.map((outcome, index) => (
                  <tr
                    key={`${outcome.guest_id}-${outcome.channel}-${index}`}
                    className="border-t border-slate-100 first:border-t-0 dark:border-white/10"
                  >
                    <td className="px-3 py-2">{outcome.name}</td>
                    <td className="px-3 py-2 text-xs uppercase text-slate-500 dark:text-white/60">
                      {outcome.channel}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {STATUS_LABEL[outcome.status]}
                      {outcome.detail ? (
                        <span className="text-slate-500 dark:text-white/60"> — {outcome.detail}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Text variant="muted" className="text-xs">
            Emails are queued and go out on the next send pass. Texts are handed to the
            carrier immediately; delivery is reported back afterwards.
          </Text>
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {neitherChannelAvailable ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
              <Text className="text-sm">
                Both sending channels are switched off. Turn one on in BPM Settings →
                Feature controls.
              </Text>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
              Send by
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.includes('email')}
                  disabled={!emailAllowed || busy}
                  onChange={() => toggleChannel('email')}
                />
                Email
                {!emailAllowed ? (
                  <span className="text-xs text-slate-400">(switched off)</span>
                ) : null}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.includes('sms')}
                  disabled={!smsAllowed || busy}
                  onChange={() => toggleChannel('sms')}
                />
                Text
                {!smsAllowed ? (
                  <span className="text-xs text-slate-400">(switched off)</span>
                ) : null}
              </label>
            </div>
          </div>

          {channels.includes('email') ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-white/80">
                Email template
              </label>
              <Select
                variant="surface"
                value={emailTemplateId}
                disabled={busy}
                onChange={(e) => setEmailTemplateId(e.target.value)}
              >
                <option value="">Use this BPM&rsquo;s assigned template</option>
                {emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
              <PassHint
                body={selectedEmail ? selectedEmail.body : null}
                scanningEnabled={guestScanningEnabled}
              />
            </div>
          ) : null}

          {channels.includes('sms') ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-white/80">
                Text template
              </label>
              <Select
                variant="surface"
                value={smsTemplateId}
                disabled={busy}
                onChange={(e) => setSmsTemplateId(e.target.value)}
              >
                <option value="">Use this BPM&rsquo;s assigned template</option>
                {smsTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
              {selectedSms ? (
                <>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-white/5 dark:text-white/80">
                    {selectedSms.body}
                  </pre>
                  <Text variant="muted" className="mt-1 text-xs">
                    About {selectedSms.segment_estimate} message
                    {selectedSms.segment_estimate === 1 ? '' : 's'} per guest, before names
                    are filled in. Each one is billed.
                  </Text>
                  <PassHint
                    body={selectedSms.body}
                    scanningEnabled={guestScanningEnabled}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
              <Text className="text-sm font-medium">{error}</Text>
            </div>
          ) : null}

          {alreadyContacted.length > 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {alreadyContacted.length} of these {guests.length} ha
                {alreadyContacted.length === 1 ? 's' : 've'} already been messaged about
                this BPM
              </p>
              <ul className="mt-1 space-y-0.5">
                {alreadyContacted.slice(0, 6).map(({ guest, summary }) => (
                  <li key={guest.id} className="text-xs text-slate-700 dark:text-white/80">
                    {guest.prospect_detail?.name || 'Guest'} —{' '}
                    {[
                      summary.email > 0 ? `${summary.email} email` : '',
                      summary.sms > 0 ? `${summary.sms} text` : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    {summary.last_sent_at
                      ? `, last ${new Date(summary.last_sent_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`
                      : ''}
                  </li>
                ))}
                {alreadyContacted.length > 6 ? (
                  <li className="text-xs text-slate-500 dark:text-white/60">
                    …and {alreadyContacted.length - 6} more
                  </li>
                ) : null}
              </ul>
              <Text variant="muted" className="mt-1 text-xs">
                Sending again is allowed — untick anyone you do not want to contact twice.
              </Text>
            </div>
          ) : null}

          <Text variant="muted" className="text-xs">
            Goes to {guests.length} guest{guests.length === 1 ? '' : 's'}. Anyone with no
            email or phone on file is skipped and listed afterwards.
          </Text>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || channels.length === 0 || guests.length === 0}
              onClick={() => void send()}
            >
              {busy ? 'Sending…' : `Send to ${guests.length}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
