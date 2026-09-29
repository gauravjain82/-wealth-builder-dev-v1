import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  /** A line under the title, such as a period or an agent code. */
  subtitle?: ReactNode;
  /** Extra header buttons, placed before the close button. */
  headerActions?: ReactNode;
  titleClassName?: string;
  /**
   * Escape and a click on the backdrop close the dialog — only the top one when two are
   * open. Off by default, so a form dialog is not lost to a stray key or click.
   */
  dismissible?: boolean;
}

/** Open modals, oldest first. Only the last one answers Escape and traps Tab. */
const openStack: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * A portal dialog. Always `role="dialog"` with `aria-modal` and a labelled title; focus
 * moves into it on open (unless something inside already took it), Tab stays inside the
 * top dialog, and focus returns to where it was on close.
 */
export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  contentClassName,
  showCloseButton = true,
  subtitle,
  headerActions,
  titleClassName,
  dismissible = false,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const pressedBackdrop = useRef(false);
  // The latest callbacks, so the listeners below are registered once per opening.
  const latest = useRef({ onClose, dismissible });
  latest.current = { onClose, dismissible };

  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('modal');
    openStack.push(token);
    const returnTo = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== token || !panel) return;
      if (event.key === 'Escape' && latest.current.dismissible) {
        event.stopPropagation();
        latest.current.onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null,
      );
      if (!items.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openStack.indexOf(token);
      if (index >= 0) openStack.splice(index, 1);
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  // A click that starts and ends on the backdrop itself, so selecting text inside the
  // panel and releasing outside it does not close the dialog.
  const onBackdropDown = (event: MouseEvent<HTMLDivElement>) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  };
  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    const fromBackdrop = pressedBackdrop.current && event.target === event.currentTarget;
    pressedBackdrop.current = false;
    if (fromBackdrop && dismissible) onClose();
  };

  return createPortal(
    <div
      className={['fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-4 dark:bg-black/60', className || ''].join(' ').trim()}
      onMouseDown={onBackdropDown}
      onClick={onBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={['flex max-h-[90vh] w-full max-w-[860px] flex-col rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl outline-none dark:border-white/15 dark:bg-[#1e2431] dark:text-white', contentClassName || ''].join(' ').trim()}
      >
        {(title || showCloseButton) && (
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
            <div className="min-w-0">
              <Heading
                as="h3"
                variant="h5"
                id={titleId}
                className={['text-slate-900 dark:text-white', titleClassName || ''].join(' ').trim()}
              >
                {title}
              </Heading>
              {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-white/60">{subtitle}</div> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
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
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
