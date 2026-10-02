/**
 * Admin: plug-in fee configuration (2026-10-03). Route `/admin/plugin-fees/settings`,
 * guarded on `can_manage || can_review || can_approve_payouts` (`canSeeFeeSettings`);
 * only `can_manage` sees the edit controls, everyone else reads. Data: `fee-schedule/`
 * (the effective-dated prices), `settings/` (billing settings) and `config-history/`.
 *
 * Sections: fee table, schedule a price change (manage), scheduled changes (Remove:
 * manage), billing settings, change history, price history. Screens and states:
 * `docs/plugin-fees/UI.md` §2.14.
 */

import { ErrorState, Heading, Text } from '@/shared/components';

import {
  useBillingSettings,
  useConfigHistory,
  useFeeSchedule,
  usePluginFeesAccess,
} from '../hooks/use-plugin-fees';
import { BillingSettingsForm, BillingSettingsView } from '../components/fee-settings/billing-settings-form';
import { ConfigHistoryTable } from '../components/fee-settings/config-history-table';
import { FeeTable, PriceHistory, ScheduledChanges } from '../components/fee-settings/fee-schedule-tables';
import { ScheduleChangeForm } from '../components/fee-settings/schedule-change-form';
import { canManageFeeSettings } from '../utils/plugin-fees-access';
import { describeError, formatDate } from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

export default function PluginFeesSettingsPage() {
  const { data: access } = usePluginFeesAccess();
  const canManage = canManageFeeSettings(access);
  const schedule = useFeeSchedule();
  const settings = useBillingSettings();
  const history = useConfigHistory();

  const scheduleState = schedule.isLoading ? (
    <p className="wb-pf-muted">Loading…</p>
  ) : schedule.isError ? (
    <ErrorState
      description={describeError(schedule.error, 'Unable to load the fee schedule.')}
      onRetry={() => void schedule.refetch()}
    />
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          Fee Settings
        </Heading>
        <Text variant="muted">
          The plug-in fee prices and the billing settings, with every change and its reason.{' '}
          {canManage ? '' : 'Read-only.'}
        </Text>
      </div>

      <section className="wb-pf-card" aria-labelledby="wb-pf-fee-table-heading">
        <h2 id="wb-pf-fee-table-heading" className="wb-pf-subheading">
          Fee table
        </h2>
        <p className="wb-pf-muted" style={{ margin: 0 }}>
          Prices are effective-dated. A price in force never changes: a change applies from a
          future 1st of the month, and each billing cycle freezes the price it used.
          {schedule.data ? ` Today is ${formatDate(schedule.data.today)}.` : ''}
        </p>
        {scheduleState ?? (schedule.data ? <FeeTable schedule={schedule.data} /> : null)}
      </section>

      {canManage ? (
        <section className="wb-pf-card" aria-labelledby="wb-pf-fee-change-heading">
          <h2 id="wb-pf-fee-change-heading" className="wb-pf-subheading">
            Schedule a price change
          </h2>
          <p className="wb-pf-muted" style={{ margin: 0 }}>
            Prices you leave as they are keep their price. Once a billing cycle exists for a month,
            prices for that month and earlier are frozen.
          </p>
          {scheduleState ?? (schedule.data ? <ScheduleChangeForm schedule={schedule.data} /> : null)}
        </section>
      ) : null}

      <section className="wb-pf-card" aria-labelledby="wb-pf-fee-scheduled-heading">
        <h2 id="wb-pf-fee-scheduled-heading" className="wb-pf-subheading">
          Scheduled changes
        </h2>
        {scheduleState ??
          (schedule.data ? <ScheduledChanges schedule={schedule.data} canManage={canManage} /> : null)}
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-billing-settings-heading">
        <h2 id="wb-pf-billing-settings-heading" className="wb-pf-subheading">
          Billing settings
        </h2>
        {settings.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : settings.isError ? (
          <ErrorState
            description={describeError(settings.error, 'Unable to load the billing settings.')}
            onRetry={() => void settings.refetch()}
          />
        ) : settings.data ? (
          canManage ? (
            // Remount on a saved (or refetched) change so the inputs show the stored values.
            <BillingSettingsForm key={settings.data.updated_at ?? 'never'} settings={settings.data} />
          ) : (
            <BillingSettingsView settings={settings.data} />
          )
        ) : null}
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-config-history-heading">
        <h2 id="wb-pf-config-history-heading" className="wb-pf-subheading">
          Change history
        </h2>
        <p className="wb-pf-muted" style={{ margin: 0 }}>
          The latest 50 changes to prices and settings, newest first.
        </p>
        {history.isLoading ? (
          <p className="wb-pf-muted">Loading…</p>
        ) : history.isError ? (
          <ErrorState
            description={describeError(history.error, 'Unable to load the change history.')}
            onRetry={() => void history.refetch()}
          />
        ) : (
          <ConfigHistoryTable entries={history.data?.results ?? []} />
        )}
      </section>

      <section className="wb-pf-card" aria-labelledby="wb-pf-price-history-heading">
        <h2 id="wb-pf-price-history-heading" className="wb-pf-subheading">
          Price history
        </h2>
        {scheduleState ?? (schedule.data ? <PriceHistory schedule={schedule.data} /> : null)}
      </section>
    </div>
  );
}
