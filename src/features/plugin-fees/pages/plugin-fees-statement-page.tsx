/**
 * The agent's statement of account (D16). Route `/plugin-fees/statement`, guarded on
 * `my-access/`.is_billable (an active MD or SMD). Data: `GET me/statement/`.
 *
 * P4: Pay now on an invoice with `can_pay_now` → `POST me/invoices/{id}/pay-link/` →
 * redirect to Stripe. Stripe returns here with `?fee_pay=success|cancelled`; on success
 * the statement is polled every 3 s for up to 30 s until that invoice reads `paid` or
 * `processing`, then the parameter is stripped — the same shape as the `?fee_pm=` return
 * in `components/plugin-fees-settings-sections.tsx`.
 *
 * P5: an SMD (a ledger, and `my-access/` level `SMD`) sees "Get paid" above the ledger —
 * the Stripe Connect payout account, which owns its own `?connect=` return.
 * Screens and states: `docs/plugin-fees/UI.md` §2.5.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ErrorState, Heading, Text } from '@/shared/components';
import { usePageRestored } from '@/hooks/use-page-restored';
import { useToastStore } from '@/store';

import { useCreateInvoicePayLink, useMyStatement, usePluginFeesAccess } from '../hooks/use-plugin-fees';
import { PluginFeesError } from '../services/plugin-fees-service';
import { ConnectPanel } from '../components/payouts/connect-panel';
import { StatementView } from '../components/statement/statement-view';
import type { StatementInvoice } from '../types';
import { canSetUpPayouts } from '../utils/plugin-fees-access';
import { describeError, formatMonth } from '../utils/plugin-fees-format';
import '../components/plugin-fees.css';

/** Stripe's webhook usually lands within seconds; poll this often, for this long. */
const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 30000;

/**
 * Stripe's return URL names the invoice (`&invoice=<id>`, contract §6.1). The id is also
 * remembered across the redirect (per tab) as a fallback for an older link; storage can
 * be blocked, in which case the URL alone is used.
 */
const PAYING_KEY = 'wb.pf.payingInvoiceId';

function rememberPaying(id: number): void {
  try {
    window.sessionStorage.setItem(PAYING_KEY, String(id));
  } catch {
    /* storage unavailable — the return falls back to a single refetch */
  }
}

function takePaying(): number | null {
  try {
    const value = window.sessionStorage.getItem(PAYING_KEY);
    window.sessionStorage.removeItem(PAYING_KEY);
    return value && /^\d+$/.test(value) ? Number(value) : null;
  } catch {
    return null;
  }
}

const SETTLED = new Set(['paid', 'processing']);

export default function PluginFeesStatementPage() {
  const { addToast } = useToastStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [poll, setPoll] = useState<{ invoiceId: number; startedAt: number } | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  usePageRestored(() => setPayingId(null));
  const handledReturn = useRef<string | null>(null);

  const statement = useMyStatement(true, poll ? POLL_EVERY_MS : false);
  const { data: access } = usePluginFeesAccess();
  const payLink = useCreateInvoicePayLink();
  const { refetch } = statement;

  // The Stripe return: toast, start polling on success, and clean the URL.
  useEffect(() => {
    const result = searchParams.get('fee_pay');
    if (!result) return;
    if (handledReturn.current !== result) {
      handledReturn.current = result;
      const fromUrl = searchParams.get('invoice');
      const remembered = takePaying();
      const invoiceId = fromUrl && /^\d+$/.test(fromUrl) ? Number(fromUrl) : remembered;
      if (result === 'success') {
        addToast({
          type: 'success',
          message: 'Payment submitted. Your statement will update once Stripe confirms it.',
        });
        if (invoiceId !== null) setPoll({ invoiceId, startedAt: Date.now() });
        void refetch();
      } else if (result === 'cancelled') {
        addToast({ type: 'info', message: 'Payment was cancelled. Nothing was charged.' });
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete('fee_pay');
    next.delete('invoice');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, addToast, refetch]);

  // Stop polling once that invoice is paid or processing, or after POLL_FOR_MS.
  const polledStatus = poll
    ? statement.data?.invoices.find((invoice) => invoice.id === poll.invoiceId)?.status
    : undefined;
  useEffect(() => {
    if (poll === null) return undefined;
    if (polledStatus && SETTLED.has(polledStatus)) {
      setPoll(null);
      addToast({
        type: 'success',
        message:
          polledStatus === 'paid'
            ? 'Payment received. Thank you.'
            : 'Bank payment in progress — it settles in about 4 business days.',
      });
      return undefined;
    }
    const remaining = Math.max(0, POLL_FOR_MS - (Date.now() - poll.startedAt));
    const timer = window.setTimeout(() => {
      setPoll(null);
      addToast({
        type: 'info',
        message: 'Stripe has not confirmed your payment yet. Refresh this page in a minute.',
      });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [poll, polledStatus, addToast]);

  const onPay = async (invoice: StatementInvoice) => {
    setPayingId(invoice.id);
    try {
      const { url } = await payLink.mutateAsync(invoice.id);
      if (!url) throw new Error('Payment is unavailable right now.');
      rememberPaying(invoice.id);
      window.location.href = url;
    } catch (error) {
      setPayingId(null);
      if (error instanceof PluginFeesError && error.code === 'not_payable') {
        addToast({
          type: 'warning',
          message: describeError(error, `The ${formatMonth(invoice.month)} invoice can no longer be paid here.`),
        });
        void refetch();
        return;
      }
      if (error instanceof PluginFeesError && error.code === 'stripe_unavailable') {
        addToast({
          type: 'error',
          message: 'Payments are temporarily unavailable. Please try again in a few minutes.',
        });
        return;
      }
      addToast({ type: 'error', message: describeError(error, 'Could not open the payment page.') });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h4" weight="bold">
          My Plug-in Fees
        </Heading>
        <Text variant="muted">
          Your plug-in fee invoices by month and, for SMDs, the running balance of MD fees
          credited to you and amounts charged. Office, assistant and payment method are on{' '}
          <Link to="/settings" className="wb-pf-link">
            Settings
          </Link>
          .
        </Text>
      </div>

      {poll ? (
        <div className="wb-pf-callout" role="status">
          Waiting for Stripe to confirm your payment…
        </div>
      ) : null}

      {statement.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : statement.isError || !statement.data ? (
        <ErrorState
          description={describeError(statement.error, 'Unable to load your statement of account.')}
          onRetry={() => void statement.refetch()}
        />
      ) : (
        <>
          {statement.data.ledger && canSetUpPayouts(access) ? <ConnectPanel /> : null}
          <StatementView statement={statement.data} payNow={{ onPay, payingId }} />
        </>
      )}
    </div>
  );
}
