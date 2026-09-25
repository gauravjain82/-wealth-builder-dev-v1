/**
 * The standalone contest route.
 *
 * `UI_CONTRACT.md` lists an optional full route alongside the embedded card, sharing
 * the same state model, APIs, filters, tier toggles and standings — an expanded
 * placement may show more, but it cannot use different qualification rules. So this
 * renders the same `ContestsCard`, given a taller box.
 *
 * The height still comes from the host, not from the feature: this page supplies a
 * flex column that fills the routed area, and the card fills that. There is no `vh`
 * unit here either.
 */

import { ContestsCard } from '../components/contests-card';

export default function ContestsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <h1 className="sr-only">Contests</h1>
      <div
        className="wb-ct-host min-h-0 flex-1 rounded-xl border border-white/10 bg-black/20 p-4"
        style={{ containerName: 'wb-ct-card', containerType: 'inline-size' }}
      >
        <ContestsCard withChrome={false} />
      </div>
    </div>
  );
}
