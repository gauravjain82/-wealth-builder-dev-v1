/** The view menu, shared by the Home v2 filter modal and the standalone filter bar. */

import type { ContestScope } from '../types';

/**
 * The views, in dtez's order (All, then the five person-based views). One list for the
 * Home v2 modal and the standalone filter bar, so the two menus cannot disagree.
 *
 * SMD base is offered for parity with dtez's menu. On the backend `base` and `smd_base`
 * are one walk (zero downline SMD generations, `population.py` `SCOPE_ALIASES`), so the
 * two show the same people. That is dtez's own generation map, not a bug to fix.
 */
export const SCOPE_OPTIONS: Array<{ value: ContestScope; label: string }> = [
  { value: 'all', label: 'Everyone I can see' },
  { value: 'personal', label: 'Just this person' },
  { value: 'base', label: 'Base shop' },
  { value: 'smd_base', label: 'SMD base' },
  { value: 'super_base', label: 'Super base' },
  { value: 'super_team', label: 'Super team' },
];

/** The label a view is shown with, in summaries as well as the menu. */
export function scopeLabel(scope: ContestScope): string {
  return SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? scope;
}
