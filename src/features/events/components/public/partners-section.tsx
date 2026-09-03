/**
 * Product-partner (sponsor) listing for the landing page, grouped by tier.
 *
 * Sponsors pay for prominence, so ordering by level is a business requirement
 * rather than a cosmetic choice: Diamond always renders above Gold, etc.
 */

import { cn } from '@core/utils';

import type { EventProductPartner } from '../../types/config';
import { PublicCard, PublicSection } from './public-event-shell';

/** Sponsorship levels, highest first — drives render order. */
const LEVEL_ORDER: EventProductPartner['level'][] = [
  'DIAMOND',
  'GOLD',
  'SILVER',
  'BRONZE',
];

const LEVEL_LABEL: Record<EventProductPartner['level'], string> = {
  DIAMOND: 'Diamond Partners',
  GOLD: 'Gold Partners',
  SILVER: 'Silver Partners',
  BRONZE: 'Bronze Partners',
};

const LEVEL_BADGE: Record<EventProductPartner['level'], string> = {
  DIAMOND: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200',
  GOLD: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  SILVER: 'bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white/80',
  BRONZE: 'bg-orange-100 text-orange-900 dark:bg-orange-400/15 dark:text-orange-200',
};

export function PartnersSection({ partners }: { partners: EventProductPartner[] }) {
  if (partners.length === 0) return null;

  const groups = LEVEL_ORDER.map((level) => ({
    level,
    members: partners.filter((partner) => partner.level === level),
  })).filter((group) => group.members.length > 0);

  return (
    <PublicSection title="Product Partners">
      <div className="space-y-6">
        {groups.map(({ level, members }) => (
          <div key={level}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  LEVEL_BADGE[level],
                )}
              >
                {LEVEL_LABEL[level]}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((partner) => (
                <PublicCard key={partner.id}>
                  <div className="font-semibold">{partner.company_name}</div>
                  {partner.description ? (
                    <p className="mt-2 text-sm text-slate-700 dark:text-white/70">
                      {partner.description}
                    </p>
                  ) : null}
                  {partner.website ? (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs underline underline-offset-2"
                      style={{ color: 'var(--event-brand)' }}
                    >
                      Visit website
                    </a>
                  ) : null}
                </PublicCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PublicSection>
  );
}
