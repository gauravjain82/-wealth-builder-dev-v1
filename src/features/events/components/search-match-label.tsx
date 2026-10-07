import { SEARCH_MATCH_LABEL, type SearchMatch } from '../utils/purchase-search';

/** "Matched: buyer · attendee" under a found purchase; nothing without a search. */
export function SearchMatchLabel({ matches }: { matches?: SearchMatch[] }) {
  if (!matches?.length) return null;
  return (
    <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
      Matched: {matches.map((m) => SEARCH_MATCH_LABEL[m]).join(' · ')}
    </div>
  );
}
