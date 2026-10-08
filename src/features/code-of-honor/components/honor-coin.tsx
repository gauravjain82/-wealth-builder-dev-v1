/**
 * The Code of Honor challenge coin, turning slowly so both faces show: the front
 * ("Guardian of the Month") and the back ("Protect the Standard").
 *
 * Decorative: the card beside it carries all the content, so the coin is hidden from
 * assistive tech. Under `prefers-reduced-motion` it holds still on the front face.
 */

import coinBack from '../assets/coin-back.webp';
import coinFront from '../assets/coin-front.webp';

export function HonorCoin() {
  return (
    <div className="wb-coh-coin" aria-hidden="true">
      <div className="wb-coh-coin__float">
        <div className="wb-coh-coin__spin">
          <img className="wb-coh-coin__face" src={coinFront} alt="" draggable={false} />
          <img
            className="wb-coh-coin__face wb-coh-coin__face--back"
            src={coinBack}
            alt=""
            draggable={false}
          />
        </div>
      </div>
      <div className="wb-coh-coin__shadow" />
    </div>
  );
}
