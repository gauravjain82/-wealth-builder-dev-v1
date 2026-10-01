import type { ReactNode } from 'react';
import { Button, type ButtonProps } from './button';
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
  /** Extra content under the message, such as an optional note field. */
  children?: ReactNode;
  /** Defaults to `destructive`; pass `default` for a non-destructive confirmation. */
  confirmVariant?: ButtonProps['variant'];
  /** Disables the confirm button, e.g. while a required field in `children` is blank. */
  confirmDisabled?: boolean;
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
  children,
  confirmVariant = 'destructive',
  confirmDisabled = false,
}: ConfirmationDialogProps) {
  if (!open) return null;

  return (
    <Modal open={open} title={title} onClose={onClose} contentClassName="max-w-[520px]">
      <div className="space-y-6">
        <Text className="text-slate-700 dark:text-white/90">{message}</Text>
        {children}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={() => void onConfirm()} disabled={loading || confirmDisabled}>
            {loading ? 'Please wait...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
