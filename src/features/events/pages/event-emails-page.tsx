import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Heading,
  Input,
  LoadingState,
  Select,
  Text,
  Textarea,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { postSaleService } from '../services/post-sale-service';
import { EventSubnav } from '../components/event-subnav';
import type { BigEvent } from '../types/event';
import type {
  BlastAudience,
  BlastStatus,
  EmailBlast,
} from '../types/post-sale';

const AUDIENCES: Array<{ value: BlastAudience; label: string }> = [
  { value: 'holders', label: 'Ticket holders (attendees)' },
  { value: 'purchasers', label: 'Purchasers (buyers)' },
  { value: 'owners', label: 'Ticket owners' },
];

const MERGE_TOKENS = [
  '{event_name}',
  '{recipient_name}',
  '{ticket_holder_name}',
  '{ticket_number}',
  '{ticket_link}',
  '{invoice_number}',
  '{purchaser_name}',
];

const STATUS_VARIANT: Record<BlastStatus, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  DRAFT: 'secondary',
  SENDING: 'warning',
  SENT: 'success',
  FAILED: 'destructive',
};

/** Compose, preview, and send email blasts to an event's audience. */
export default function EventEmailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [blasts, setBlasts] = useState<EmailBlast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state (create or edit-draft).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<BlastAudience>('holders');
  const [checkedInOnly, setCheckedInOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBlasts(await postSaleService.listBlasts(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blasts');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
    void load();
  }, [id, load]);

  const resetComposer = () => {
    setEditingId(null);
    setSubject('');
    setContent('');
    setAudience('holders');
    setCheckedInOnly(false);
  };

  const editDraft = (blast: EmailBlast) => {
    setEditingId(blast.id);
    setSubject(blast.subject);
    setContent(blast.content);
    setAudience(blast.recipient_filter?.audience ?? 'holders');
    setCheckedInOnly(blast.recipient_filter?.checked_in === true);
  };

  const save = async () => {
    if (!subject.trim()) return;
    setSaving(true);
    const recipient_filter = {
      audience,
      ...(audience === 'holders' && checkedInOnly ? { checked_in: true } : {}),
    };
    const payload = { subject, content, recipient_filter };
    try {
      if (editingId) {
        await postSaleService.updateBlast(id, editingId, payload);
        addToast({ type: 'success', message: 'Draft saved.' });
      } else {
        await postSaleService.createBlast(id, payload);
        addToast({ type: 'success', message: 'Draft created.' });
      }
      resetComposer();
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const preview = async (blastId: number) => {
    try {
      const result = await postSaleService.previewBlastRecipients(id, blastId);
      const names = result.preview.slice(0, 5).map((r) => r.email).join(', ');
      addToast({
        type: 'success',
        message: `${result.count} recipient(s)${names ? `: ${names}${result.count > 5 ? '…' : ''}` : ''}`,
      });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Preview failed' });
    }
  };

  const send = async (blast: EmailBlast) => {
    if (!window.confirm(`Send "${blast.subject}" to ${blast.recipient_count} recipient(s)? This cannot be undone.`)) {
      return;
    }
    try {
      const result = await postSaleService.sendBlast(id, blast.id);
      addToast({ type: 'success', message: `Queued ${result.queued} email(s).` });
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Send failed' });
    }
  };

  const remove = async (blastId: number) => {
    try {
      await postSaleService.deleteBlast(id, blastId);
      if (editingId === blastId) resetComposer();
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' });
    }
  };

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Emails'}
        </Heading>
        <Text variant="muted">Compose and send blasts to your attendees</Text>
      </div>
      <EventSubnav eventId={id} />

      <Card>
        <CardContent className="space-y-3 p-4">
          <Text className="font-medium">{editingId ? 'Edit draft' : 'New blast'}</Text>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Email body (HTML allowed). Use merge tokens below."
            rows={6}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value as BlastAudience)}
              className="max-w-[260px]"
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
            {audience === 'holders' ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checkedInOnly} onChange={(e) => setCheckedInOnly(e.target.checked)} />
                Checked-in only
              </label>
            ) : null}
          </div>
          <Text variant="muted" className="text-xs">
            Merge tokens: {MERGE_TOKENS.join('  ·  ')}
          </Text>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void save()} disabled={!subject.trim() || saving}>
              {editingId ? 'Save draft' : 'Create draft'}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetComposer}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Text className="text-red-600">{error}</Text>
      ) : blasts.length === 0 ? (
        <Text variant="muted">No blasts yet.</Text>
      ) : (
        <div className="space-y-3">
          {blasts.map((blast) => (
            <Card key={blast.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Text className="font-medium">{blast.subject}</Text>
                    <Badge variant={STATUS_VARIANT[blast.status]}>{blast.status}</Badge>
                  </div>
                  <Text variant="muted" className="text-xs">
                    {AUDIENCES.find((a) => a.value === (blast.recipient_filter?.audience ?? 'holders'))?.label} ·{' '}
                    {blast.recipient_count} recipient(s)
                    {blast.sent_at ? ` · sent ${new Date(blast.sent_at).toLocaleString()}` : ''}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void preview(blast.id)}>
                    Preview recipients
                  </Button>
                  {blast.status === 'DRAFT' || blast.status === 'FAILED' ? (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => editDraft(blast)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" onClick={() => void send(blast)}>
                        Send
                      </Button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => void remove(blast.id)}
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
