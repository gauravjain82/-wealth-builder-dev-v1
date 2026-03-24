import { useToastStore, type Toast as ToastType } from '@/store';
import { X } from 'lucide-react';
import { cn } from '@core/utils';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
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
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg p-4 shadow-lg animate-in slide-in-from-right',
        typeStyles[toast.type]
      )}
    >
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="rounded-full p-1 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
