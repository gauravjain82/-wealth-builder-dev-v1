import { useToastStore, type Toast as ToastType } from '@/store';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@core/utils';
import { Text } from '../ui/typography';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[1300] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastType;
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const typeStyles = {
    success: 'border-l-4 border-l-emerald-400/95',
    error: 'border-l-4 border-l-red-400/95',
    warning: 'border-l-4 border-l-[#ffd76f]/95',
    info: 'border-l-4 border-l-sky-400/95',
  };

  const typeIcons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
    error: <XCircle className="h-4 w-4 text-red-300" />,
    warning: <AlertTriangle className="h-4 w-4 text-[#ffd76f]" />,
    info: <Info className="h-4 w-4 text-sky-300" />,
  };

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-xl border border-white/15 bg-[#1e2431]/95 p-3 text-white shadow-2xl backdrop-blur-sm animate-in fade-in-0 slide-in-from-top-2',
        typeStyles[toast.type]
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5">{typeIcons[toast.type]}</div>
        <Text variant="small" className="font-medium leading-5 text-white/95">
          {toast.message}
        </Text>
      </div>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-[#ffd700]"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
