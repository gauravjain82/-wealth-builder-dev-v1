import { Button } from '@shared/components';

interface DoorIdCheckPromptProps {
  message: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The link endpoint's `no_contact_match`: neither email nor phone on the
 * profile matches the ticket. Linking anyway is a deliberate, recorded act —
 * staff confirm they checked photo ID.
 */
export function DoorIdCheckPrompt({ message, busy, onConfirm, onCancel }: DoorIdCheckPromptProps) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{message}</p>
      <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
        An email or phone match is preferred. Only link if the photo ID matches the name on the ticket.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onConfirm}>
          I checked photo ID — link anyway
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
