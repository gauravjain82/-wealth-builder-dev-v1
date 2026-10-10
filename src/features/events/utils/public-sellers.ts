/**
 * The event's SMD list as the public forms show it.
 *
 * Our own leaders arrive with a blank `team_name`; the organizer names their
 * team on the `checkout` section (`own_team_label`), and that name is filled in
 * here so the team picker (`SellerSelect`) lists it beside the external teams.
 * With no name set the list is returned untouched and the picker falls back to
 * its default label.
 */

import type { CheckoutContent } from '../types/landing';
import type { PublicEvent, PublicSeller } from '../types/public';

export function sellersByTeam(event: Pick<PublicEvent, 'sellers' | 'sections'>): PublicSeller[] {
  const checkout = event.sections?.find((section) => section.section_type === 'checkout');
  const label = (checkout?.content as CheckoutContent | undefined)?.own_team_label?.trim();
  if (!label) return event.sellers;
  return event.sellers.map((seller) =>
    seller.team_name ? seller : { ...seller, team_name: label },
  );
}
