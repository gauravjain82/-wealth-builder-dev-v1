import React from 'react';
import { Modal, Button } from '@/shared/components';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'secondary' | 'destructive' | 'default' | 'outline' | 'ghost' | 'link';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'secondary',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      contentClassName="max-w-sm rounded-lg bg-[#232733] shadow-xl border border-white/10 p-0"
    >
      <div className="flex flex-col px-6 pt-4 pb-2">
        {/* <div className="text-[16px] font-semibold text-white mb-1 text-left">{title}</div> */}
        <div className="text-[15px] text-white/80 mb-4 text-left">{message}</div>
      </div>
      <div className="flex flex-row justify-end gap-2 px-6 pb-0">
        <Button type="button" size="sm" variant="outline" className="min-w-[90px]" onClick={onCancel}>{cancelLabel}</Button>
        <Button type="button" size="sm" variant={confirmVariant} className="min-w-[90px]" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
};
