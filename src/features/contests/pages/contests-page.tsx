/**
 * The standalone contest route, laid out as dtez's `wb_contests.php` (parity phase 18).
 *
 * `ContestsBoard` reads the same state as the Home v2 card (`useContestBoard`), so it
 * uses the same qualification rules, APIs, filters and tier toggles; only the layout
 * differs. `docs/contests/UI.md` §2.1.
 *
 * The height still comes from the host, not from the feature: this page supplies a
 * flex column that fills the routed area, and the board fills that. There is no `vh`
 * unit here either. The host is also the `wb-ct-card` container the board's narrow
 * rules query.
 *
 * Only here are the other contests' standings warmed: switching contests is what this
 * page is for (decision C24).
 */

import { ContestsBoard } from '../components/contests-board';

export default function ContestsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div
        className="wb-ct-host min-h-0 flex-1 rounded-xl border border-white/10 bg-black/20 p-4"
        style={{ containerName: 'wb-ct-card', containerType: 'inline-size' }}
      >
        <ContestsBoard />
      </div>
    </div>
  );
}
