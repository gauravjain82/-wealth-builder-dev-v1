/**
 * One search box vocabulary for Purchases and Check-in — both call the same
 * server-side search (`events.filters.search_orders` / `search_tickets`).
 */

/** Short placeholder; the full list is in {@link PURCHASE_SEARCH_HELP}. */
export const PURCHASE_SEARCH_PLACEHOLDER = 'Search name, email, phone, ticket, invoice, confirmation…';

/** Tooltip naming everything the search matches. */
export const PURCHASE_SEARCH_HELP =
  'Buyer or attendee name, email or phone (any format) · our purchase or ticket number · ' +
  'BSCPro invoice number, purchase confirmation or ticket confirmation';

/** Whose name / email / phone the search looks at (`?search_in=`). */
export type SearchIn = 'all' | 'buyer' | 'attendee';

export const SEARCH_IN_OPTIONS: Array<{ value: SearchIn; label: string }> = [
  { value: 'all', label: 'Search in: everywhere' },
  { value: 'buyer', label: 'Search in: buyer' },
  { value: 'attendee', label: 'Search in: attendee' },
];

/** What a found purchase matched on (server `search_match`). */
export type SearchMatch = 'buyer' | 'attendee' | 'number';

export const SEARCH_MATCH_LABEL: Record<SearchMatch, string> = {
  buyer: 'buyer',
  attendee: 'attendee',
  number: 'number',
};

/** Row highlight for whatever the search named (a ticket, the buyer). */
export const SEARCH_HIT_CLASS = 'rounded bg-amber-100 px-1 dark:bg-amber-400/20';
