import { useEffect } from 'react';
import { useUIStore } from '@/store/slices/ui-slice';

export function useTheme() {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    const resolvedTheme =
      theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

    root.classList.add(resolvedTheme);
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [theme]);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      const resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(resolvedTheme);
      root.dataset.theme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return { theme, setTheme };
}
