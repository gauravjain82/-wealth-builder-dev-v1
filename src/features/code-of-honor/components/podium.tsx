/** Up to three placed acts. A shared place is labelled in words, not only by colour. */

import type { PodiumEntry, RevealedAct } from '../types';
import { ActText } from './act-text';

type Entry = PodiumEntry | (RevealedAct & { place: number; coins: number; shared_place: boolean });

const ORDINAL = ['1st', '2nd', '3rd'];

function placeLabel(place: number): string {
  return ORDINAL[place - 1] ?? `${place}th`;
}

export function Podium({ entries, compact = false }: { entries: Entry[]; compact?: boolean }) {
  return (
    <ol className={compact ? 'wb-coh-podium wb-coh-podium--compact' : 'wb-coh-podium'}>
      {entries.map((entry, index) => (
        <li key={`${entry.place}-${index}`} className={`wb-coh-podium__item wb-coh-podium__item--p${entry.place}`}>
          <div className="wb-coh-podium__place">
            {placeLabel(entry.place)}
            {entry.shared_place && <span className="wb-coh-shared"> · shared place</span>}
          </div>
          <div className="wb-coh-podium__name">{entry.nominee_name}</div>
          <div className="wb-coh-podium__meta">
            {entry.coins} {entry.coins === 1 ? 'coin' : 'coins'} · {entry.likes} {entry.likes === 1 ? 'like' : 'likes'}
          </div>
          {!compact && 'text' in entry && (
            <>
              <ActText text={entry.text} />
              <div className="wb-coh-act__meta">
                <span className="wb-coh-tag">{entry.value}</span>
                {entry.values.map((value) => (
                  <span key={value} className="wb-coh-tag wb-coh-tag--soft">{value}</span>
                ))}
              </div>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
