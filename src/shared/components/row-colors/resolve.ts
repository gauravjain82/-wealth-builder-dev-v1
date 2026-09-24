import type { CSSProperties } from 'react';
import type {
  ResolvedRowColors,
  RowColorChannel,
  RowColorRule,
  RowColorStyle,
} from './types';

/**
 * Resolving active row states into concrete CSS.
 *
 * Kept as pure functions (no React, no fetching) so the same logic serves list
 * rendering, the Phase 7 settings editor's live preview, and unit tests.
 */

/** Opacity applied to a `fill` hex so the tint reads in both light and dark themes. */
const FILL_ALPHA_HEX = '26'; // ~15%

/** Which channel a style paints on. `border` and `left-border` compete for one slot. */
const CHANNEL_BY_STYLE: Record<RowColorStyle, RowColorChannel> = {
  fill: 'fill',
  border: 'border',
  'left-border': 'border',
};

/**
 * Normalise a user-entered hex to lowercase `#rrggbb`.
 *
 * Accepts `fff`, `#FFF`, `ffffff` and `#FFFFFF`; three-digit shorthand is
 * expanded. Returns `null` when the input is not a valid hex colour, so callers
 * can reject it rather than silently painting something unexpected.
 */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(raw)) {
    const [r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return null;
}

/**
 * Whether a candidate colour may be used for a new business-defined rule.
 *
 * The brief requires colour schemes to be unique and forbids reusing a reserved
 * default's colour. Comparison is on the normalised hex, so `#FFF` and `#ffffff`
 * are correctly treated as the same colour.
 *
 * @param candidate Hex the user typed.
 * @param rules     Every rule currently in the set, reserved and custom.
 * @param ignoreKey Rule being edited — its own colour should not block it.
 */
export function isHexAvailable(
  candidate: string,
  rules: RowColorRule[],
  ignoreKey?: string,
): boolean {
  const normalized = normalizeHex(candidate);
  if (!normalized) return false;
  return !rules.some(
    (rule) => rule.key !== ignoreKey && normalizeHex(rule.hex) === normalized,
  );
}

/**
 * Pick the winning rule on each channel for one row.
 *
 * Every rule whose `key` is active and which is `enabled` competes; the lowest
 * `priority` wins its channel. Fill and border are resolved independently, so a
 * row can carry both (e.g. a yellow "confirmed" fill under a green "appointment
 * scheduled" outline).
 *
 * @param activeKeys Condition keys true for this row. Falsy entries are ignored,
 *                   so callers can write `[guest.confirmed && 'bpm.guest.confirmed']`.
 * @param rules      The rule set in force.
 */
export function resolveRowColors(
  activeKeys: ReadonlyArray<string | false | null | undefined>,
  rules: ReadonlyArray<RowColorRule>,
): ResolvedRowColors {
  const active = new Set(activeKeys.filter(Boolean) as string[]);
  if (active.size === 0) return {};

  const resolved: ResolvedRowColors = {};
  for (const rule of rules) {
    if (!rule.enabled || !active.has(rule.key)) continue;
    const channel = CHANNEL_BY_STYLE[rule.style];
    const incumbent = resolved[channel];
    if (!incumbent || rule.priority < incumbent.priority) {
      resolved[channel] = rule;
    }
  }
  return resolved;
}

/**
 * Turn a resolved pair into inline styles for a `<tr>` or card element.
 *
 * Fills are applied as a low-alpha tint of the configured hex rather than the
 * flat colour: a solid pastel would wash out text in dark mode, whereas a tint
 * composites correctly over either theme's background and leaves text colour
 * alone. Borders use the solid hex, since they never sit behind text.
 */
export function rowColorStyle(resolved: ResolvedRowColors): CSSProperties {
  const style: CSSProperties = {};

  if (resolved.fill) {
    const hex = normalizeHex(resolved.fill.hex);
    if (hex) style.backgroundColor = `${hex}${FILL_ALPHA_HEX}`;
  }

  if (resolved.border) {
    const hex = normalizeHex(resolved.border.hex);
    if (hex) {
      if (resolved.border.style === 'left-border') {
        style.borderLeft = `4px solid ${hex}`;
      } else {
        style.outline = `2px solid ${hex}`;
        // Keep the outline inside the row box so it is not clipped by the
        // table's overflow container and does not overlap adjacent rows.
        style.outlineOffset = '-2px';
      }
    }
  }

  return style;
}

/**
 * Convenience wrapper: active keys straight to inline styles.
 *
 * The common case in a list row — use {@link resolveRowColors} directly only
 * when the winning rule itself is needed (a legend, a tooltip, the settings
 * preview).
 */
export function rowColorStyleFor(
  activeKeys: ReadonlyArray<string | false | null | undefined>,
  rules: ReadonlyArray<RowColorRule>,
): CSSProperties {
  return rowColorStyle(resolveRowColors(activeKeys, rules));
}

/**
 * Human-readable explanation of why a row is coloured, for `title`/aria text.
 *
 * Colour alone is not an accessible signal, so every coloured row should also
 * carry this as a tooltip.
 */
export function rowColorLabel(resolved: ResolvedRowColors): string {
  const labels = [resolved.fill?.label, resolved.border?.label].filter(Boolean);
  return labels.join(' · ');
}
