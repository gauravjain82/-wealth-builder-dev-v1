import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ButtonIcon } from '../button-icon';
import { Heading } from '../typography';

interface ModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  contentClassName,
  showCloseButton = true,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className={['fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-4 dark:bg-black/60', className || ''].join(' ').trim()}>
      <div className={['w-full max-w-[860px] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-white/15 dark:bg-[#1e2431] dark:text-white', contentClassName || ''].join(' ').trim()}>
        {(title || showCloseButton) && (
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
            <Heading as="h3" variant="h5" className="text-slate-900 dark:text-white">{title}</Heading>
            {showCloseButton ? (
              <ButtonIcon
                icon={<X size={18} strokeWidth={2.5} />}
                ariaLabel="Close"
                variant="outline"
                onClick={onClose}
                className="rounded-lg border-slate-300 bg-white hover:bg-slate-100 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10"
              />
            ) : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
