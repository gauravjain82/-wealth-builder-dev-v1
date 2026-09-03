import type { ComponentType } from 'react';
import type { BigEvent, BigEventPayload } from '../../types/event';
import { EventTab } from './tabs/event-tab';
import { LocationTab } from './tabs/location-tab';
import { PaymentsTab } from './tabs/payments-tab';
import { TicketingTab } from './tabs/ticketing-tab';
import { PricingTab } from './tabs/pricing-tab';
import { CustomFieldsTab } from './tabs/custom-fields-tab';
import { PoliciesTab } from './tabs/policies-tab';
import { SpeakersTab } from './tabs/speakers-tab';
import { PartnersTab } from './tabs/partners-tab';
import { AddOnsTab } from './tabs/addons-tab';
import { PromosTab } from './tabs/promos-tab';
import { DesignTab } from './tabs/design-tab';
import type { TabProps } from './tabs/types';

interface BuilderTabContentProps {
  activeTab: string;
  event: BigEvent;
  saving: boolean;
  onSave: (data: Partial<BigEventPayload>) => Promise<void>;
}

// Registry of implemented tab components. Adding a Phase 1c tab means importing
// its component and adding one entry here — the shell stays untouched (OCP).
const TAB_COMPONENTS: Record<string, ComponentType<TabProps>> = {
  event: EventTab,
  location: LocationTab,
  payments: PaymentsTab,
  ticketing: TicketingTab,
  pricing: PricingTab,
  fields: CustomFieldsTab,
  policies: PoliciesTab,
  speakers: SpeakersTab,
  partners: PartnersTab,
  addons: AddOnsTab,
  promos: PromosTab,
  design: DesignTab,
};

/** Renders the active builder tab, or a placeholder for pending (1c) tabs. */
export function BuilderTabContent({ activeTab, event, saving, onSave }: BuilderTabContentProps) {
  const TabComponent = TAB_COMPONENTS[activeTab];
  if (!TabComponent) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        This tab is coming soon.
      </p>
    );
  }
  return <TabComponent event={event} saving={saving} onSave={onSave} />;
}
