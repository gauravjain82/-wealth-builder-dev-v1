/**
 * React context carrying the active public-page theme from `PublicEventShell`
 * down to the section components (hero layout, heading style, card surface).
 *
 * Lives in a `.ts` module so the component files keep exporting only
 * components (Vite fast-refresh rule).
 */

import { createContext, useContext } from 'react';

import { EVENT_THEMES, type EventThemeDefinition } from './registry';

export const EventThemeContext = createContext<EventThemeDefinition>(EVENT_THEMES.classic);

/** The theme of the public page currently rendering. */
export function useEventTheme(): EventThemeDefinition {
  return useContext(EventThemeContext);
}
