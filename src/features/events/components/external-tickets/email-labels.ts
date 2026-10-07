import type { EmailOutcome, EmailRunKind, EmailRunStatus, EmailTargetStatus } from '../../types/external-tickets';

/** Display wording for the "Email holders" step. */

type BadgeVariant = 'success' | 'warning' | 'secondary' | 'outline' | 'info' | 'destructive';

export const TARGET_STATUS: Record<EmailTargetStatus, { label: string; variant: BadgeVariant }> = {
  ready: { label: 'Ready', variant: 'success' },
  review: { label: 'Needs review', variant: 'warning' },
  missing: { label: 'No email', variant: 'secondary' },
  unnamed: { label: 'No holder name', variant: 'outline' },
};

export const REASON_LABEL: Record<string, string> = {
  no_holder_name: 'BSCPro has no attendee name for this ticket — nobody is emailed.',
  no_email: 'No usable email on the ticket or the holder’s WB account.',
  email_belongs_to_smd: 'The ticket’s email is the SMD/CEO’s own address, so it is not used for this holder.',
};

export const SOURCE_LABEL: Record<string, string> = {
  ticket_email: 'from ticket',
  holder_account: 'from WB account',
};

export const OUTCOME: Record<EmailOutcome, { label: string; variant: BadgeVariant }> = {
  planned: { label: 'Not sent yet', variant: 'outline' },
  cancelled: { label: 'Not sent (stopped)', variant: 'secondary' },
  skipped: { label: 'Skipped — already emailed', variant: 'secondary' },
  error: { label: 'Could not build', variant: 'destructive' },
  queued: { label: 'Queued', variant: 'info' },
  sent: { label: 'Sent', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  opened: { label: 'Opened', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  bounced: { label: 'Bounced', variant: 'destructive' },
};

export const RUN_KIND: Record<EmailRunKind, string> = {
  preview: 'Preview to me',
  test: 'Test send',
  bulk: 'Send to all',
  retry: 'Retry failed',
};

export const RUN_STATUS: Record<EmailRunStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Awaiting confirmation', variant: 'outline' },
  sending: { label: 'Sending…', variant: 'info' },
  done: { label: 'Done', variant: 'success' },
  cancelled: { label: 'Stopped', variant: 'warning' },
  discarded: { label: 'Discarded', variant: 'secondary' },
};

export const EXCLUDED_LABEL: Record<string, string> = {
  unnamed: 'no holder name',
  missing: 'no email',
  review: 'need review (SMD/CEO’s email)',
  already_emailed: 'already emailed',
};

/** Outcomes shown as counters on a run, in display order. */
export const COUNT_ORDER: EmailOutcome[] = ['queued', 'sent', 'delivered', 'opened', 'bounced', 'failed', 'error', 'skipped', 'cancelled'];

export const formatWhen = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
