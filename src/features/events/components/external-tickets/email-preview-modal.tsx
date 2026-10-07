import { Button, ErrorState, LoadingState, Modal, Text } from '@shared/components';
import type { EmailPreview } from '../../types/external-tickets';

interface EmailPreviewModalProps {
  open: boolean;
  preview: EmailPreview | undefined;
  loading: boolean;
  error: string | null;
  sendingToMe: boolean;
  onSendToMe: () => void;
  onClose: () => void;
}

/**
 * The exact email a holder would get, rendered in a sandboxed frame (no
 * scripts). Opening it sends nothing; "Send this preview to me" emails only the
 * signed-in staff member, with a PREVIEW banner.
 */
export function EmailPreviewModal(props: EmailPreviewModalProps) {
  const { open, preview, loading, error } = props;
  return (
    <Modal
      open={open}
      onClose={props.onClose}
      dismissible
      title="Email preview"
      subtitle={preview ? `To ${preview.to} · ${preview.subject} · ${preview.tickets} ticket${preview.tickets > 1 ? 's' : ''}` : undefined}
      contentClassName="max-w-3xl"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : preview ? (
        <div className="space-y-3">
          <Text variant="muted" className="text-sm">Nothing has been sent. This is how the email will look.</Text>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview.html}
            className="h-[65vh] w-full rounded-lg border border-slate-200 bg-white dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={props.onClose}>Close</Button>
            <Button onClick={props.onSendToMe} disabled={props.sendingToMe}>
              {props.sendingToMe ? 'Sending…' : 'Send this preview to me'}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
