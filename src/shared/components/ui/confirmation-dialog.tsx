import { Button } from './button';
import { Modal } from './modal';
import { Text } from './typography';

interface ConfirmationDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmationDialog({
  open,
  title = 'Please Confirm',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  if (!open) return null;

  return (
    <Modal open={open} title={title} onClose={onClose} contentClassName="max-w-[520px]">
      <div className="space-y-6">
        <Text className="text-slate-700 dark:text-white/90">{message}</Text>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button type="button" variant="destructive" onClick={() => void onConfirm()} disabled={loading}>
            {loading ? 'Please wait...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
