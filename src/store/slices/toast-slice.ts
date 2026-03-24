import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Toast Types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Create Toast Store
export const useToastStore = create<ToastState>()(
  devtools(
    (set) => ({
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 11);
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));

        // Auto-remove after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, duration);
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),
    }),
    { name: 'Toast Store' }
  )
);
