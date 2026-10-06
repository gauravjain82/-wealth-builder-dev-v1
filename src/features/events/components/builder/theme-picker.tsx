import { Check } from 'lucide-react';
import { cn } from '@core/utils';
import {
  EVENT_THEME_LIST,
  type EventThemeDefinition,
  type EventThemeKey,
} from '../../themes/registry';

interface ThemePickerProps {
  value: EventThemeKey;
  onChange: (key: EventThemeKey) => void;
  /** Organizer's accent override, previewed on every card when set. */
  accent?: string;
}

/**
 * Radio-card picker for the public page theme.
 *
 * Each card draws a tiny wireframe in the theme's own colors (page, surface,
 * accent) and hero shape, so organizers can compare looks without saving.
 */
export function ThemePicker({ value, onChange, accent }: ThemePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Page theme"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {EVENT_THEME_LIST.map((theme) => {
        const selected = theme.key === value;
        return (
          <button
            key={theme.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(theme.key)}
            className={cn(
              'relative flex flex-col overflow-hidden rounded-lg border text-left transition',
              selected
                ? 'border-blue-500 ring-2 ring-blue-500/40'
                : 'border-slate-200 hover:border-slate-400 dark:border-white/10 dark:hover:border-white/30',
            )}
          >
            <ThemeThumbnail theme={theme} accent={accent} />
            <span className="flex flex-col gap-0.5 p-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {theme.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-white/60">{theme.description}</span>
            </span>
            {selected && (
              <span className="absolute right-2 top-2 rounded-full bg-blue-500 p-0.5 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Miniature page: header, hero in the theme's layout, a row of cards. */
function ThemeThumbnail({ theme, accent }: { theme: EventThemeDefinition; accent?: string }) {
  const [page, surface, themeAccent] = theme.swatches;
  const color = accent || themeAccent;
  const dark = theme.scheme === 'dark';
  const ink = dark ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.7)';
  const line = dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';
  const radius =
    theme.buttonRadius === '9999px' ? 999 : theme.buttonRadius === '0' ? 0 : theme.button === 'metallic' ? 1 : 3;

  const cta = (
    <span
      className="block h-2 w-8"
      style={{
        background:
          theme.button === 'metallic'
            ? `linear-gradient(180deg, color-mix(in srgb, ${color} 55%, white), ${color} 60%, color-mix(in srgb, ${color} 78%, black))`
            : color,
        borderRadius: radius,
        boxShadow:
          theme.button === 'metallic'
            ? `0 0 6px color-mix(in srgb, ${color} 60%, transparent)`
            : undefined,
      }}
    />
  );

  // Champion: full-bleed hero with heavy title bottom-left, then the boxed
  // countdown band, then hairline cards.
  if (theme.heading === 'impact') {
    const hairline = `color-mix(in srgb, ${color} 35%, transparent)`;
    return (
      <span className="block h-28" style={{ background: page }} aria-hidden="true">
        <span
          className="flex h-14 flex-col justify-end gap-1 p-2"
          style={{ background: `linear-gradient(to top, ${page}, #3a3226)` }}
        >
          <span className="block h-2 w-16 rounded-[1px]" style={{ background: '#fff' }} />
          <span className="block h-1.5 w-12 rounded-[1px]" style={{ background: '#fff', opacity: 0.85 }} />
          {cta}
        </span>
        <span className="flex justify-center gap-1 py-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="flex h-4 w-4 items-center justify-center rounded-[2px]"
              style={{ background: surface, border: `1px solid ${hairline}` }}
            >
              <span className="block h-1.5 w-2 rounded-[1px]" style={{ background: color }} />
            </span>
          ))}
        </span>
        <span className="grid grid-cols-3 gap-1 px-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-5"
              style={{
                background: surface,
                border: `1px solid ${hairline}`,
                borderTopColor: color,
                borderRadius: 2,
              }}
            />
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className="block h-28 p-2" style={{ background: page }} aria-hidden="true">
      <span
        className="mb-1.5 block h-1.5 w-10 rounded-sm"
        style={{ background: ink, opacity: 0.5 }}
      />
      {theme.hero === 'immersive' ? (
        <span
          className="flex h-12 flex-col justify-end gap-1 rounded-sm p-1.5"
          style={{ background: `linear-gradient(to top, ${page}, #3f3f46)` }}
        >
          <span className="block h-2 w-20 rounded-sm" style={{ background: '#fff' }} />
          {cta}
        </span>
      ) : theme.hero === 'split' ? (
        <span className="grid h-12 grid-cols-2 items-center gap-2">
          <span className="flex flex-col gap-1">
            <span className="block h-2 w-14" style={{ background: ink }} />
            <span className="block h-1 w-10" style={{ background: line }} />
            {cta}
          </span>
          <span className="block h-full" style={{ background: '#cbd5e1' }} />
        </span>
      ) : (
        <span className="block h-12 overflow-hidden rounded" style={{ background: '#0f172a' }}>
          <span className="block h-6" style={{ background: '#475569' }} />
          <span className="flex items-center gap-1 p-1">
            <span className="block h-1.5 w-12 rounded-sm bg-white/80" />
            {cta}
          </span>
        </span>
      )}
      <span className="mt-1.5 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-6"
            style={{
              background: surface,
              border: `1px solid ${line}`,
              borderRadius: theme.buttonRadius === '0' ? 0 : 3,
            }}
          />
        ))}
      </span>
    </span>
  );
}
