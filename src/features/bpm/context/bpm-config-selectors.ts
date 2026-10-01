import { useBpmConfig } from './bpm-config-context';
import type { BPMStatCardKey } from '../types';

/*
 * Narrow readers of the BPM settings, kept in a .ts file beside the provider so
 * the provider's file stays components-only for Fast Refresh.
 */

/**
 * Whether a BPM title should open the attachments popup.
 *
 * Same permissive default as the download gate: the real gate is server-side
 * (with viewing off the response carries no file URL), so while settings are
 * unresolved a title may be a link that opens a popup with nothing to open —
 * better than a flyer that is there and cannot be reached.
 */
export function useAttachmentsViewAllowed(): boolean {
  return useBpmConfig().settings?.attachments_view ?? true;
}

/** One shared empty map, so a consumer's memo does not re-run every render. */
const NO_STAT_CARD_COLORS: Partial<Record<BPMStatCardKey, string>> = {};

/**
 * The configured background per check-in stat card, as `#rrggbb`.
 *
 * Empty until settings resolve (or if they fail); a card with no entry keeps
 * its built-in color, so the row never renders as blank white boxes. BPM
 * Settings refreshes the provider after a save, so both check-in screens pick a
 * change up without a reload.
 */
export function useStatCardColors(): Partial<Record<BPMStatCardKey, string>> {
  return useBpmConfig().settings?.stat_card_colors ?? NO_STAT_CARD_COLORS;
}
