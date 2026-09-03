/**
 * Registry of builder tabs (open/closed: add a tab by adding an entry here and
 * a case in `builder-tab-content.tsx` — the shell never changes).
 *
 * `implemented` distinguishes tabs shipped in Phase 1b (core config) from those
 * still pending in Phase 1c; unimplemented tabs render a "coming soon" panel.
 */
export interface TabDefinition {
  id: string;
  label: string;
  /** False until the tab's form lands (Phase 1c). */
  implemented: boolean;
}

export const TAB_REGISTRY: TabDefinition[] = [
  // Phase 1b — core tabs
  { id: 'event', label: 'Event', implemented: true },
  { id: 'location', label: 'Location', implemented: true },
  { id: 'payments', label: 'Payments', implemented: true },
  { id: 'ticketing', label: 'Team Ticketing', implemented: true },
  // Phase 1c — remaining tabs
  { id: 'pricing', label: 'Ticket Price', implemented: true },
  { id: 'fields', label: 'Custom Fields', implemented: true },
  { id: 'policies', label: 'Policies', implemented: true },
  { id: 'speakers', label: 'Speakers', implemented: true },
  { id: 'partners', label: 'Product Partners', implemented: true },
  { id: 'addons', label: 'Add-Ons', implemented: true },
  { id: 'promos', label: 'Promo Codes', implemented: true },
  { id: 'design', label: 'Design', implemented: true },
];

/** Fields required before an event can be published (mirrors the backend). */
export const PUBLISH_REQUIRED_FIELDS = ['name', 'shortcut', 'begin_at', 'end_at'] as const;
