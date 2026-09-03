import type { BigEvent, BigEventPayload } from '../../../types/event';

/**
 * Props every builder tab receives from the shell. Tabs own their local form
 * state (seeded from `event`) and delegate persistence to `onSave`, which
 * PATCHes only the fields that tab manages.
 */
export interface TabProps {
  event: BigEvent;
  saving: boolean;
  onSave: (data: Partial<BigEventPayload>) => Promise<void>;
}
