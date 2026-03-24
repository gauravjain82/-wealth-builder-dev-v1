import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// UI State Types
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  uiVersion: 'classic' | 'modern';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setUIVersion: (version: 'classic' | 'modern') => void;
}

// Create UI Store
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'system',
        uiVersion: 'modern',
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        setUIVersion: (version) => set({ uiVersion: version }),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          uiVersion: state.uiVersion,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'UI Store' }
  )
);
