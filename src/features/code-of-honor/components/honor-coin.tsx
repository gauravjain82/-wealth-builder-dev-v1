/**
 * The Code of Honor challenge coin, both faces side by side above the Post tab's feed: the
 * front ("Guardian of the Month") and the back ("Protect the Standard"), each swaying
 * and floating out of step with the other.
 *
 * Decorative: the card carries all the content, so the coins are hidden from assistive
 * tech. Under `prefers-reduced-motion` they hold still.
 */

import coinBack from '../assets/coin-back.webp';
import coinFront from '../assets/coin-front.webp';

export function HonorCoins() {
  return (
    <div className="wb-coh-coins" aria-hidden="true">
      <img className="wb-coh-coins__coin" src={coinFront} alt="" draggable={false} />
      <img className="wb-coh-coins__coin wb-coh-coins__coin--back" src={coinBack} alt="" draggable={false} />
    </div>
  );
}
