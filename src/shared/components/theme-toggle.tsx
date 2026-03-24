import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import './theme-toggle.css';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="theme-toggle">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`theme-toggle__button ${theme === value ? 'theme-toggle__button--active' : ''}`}
          title={label}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
