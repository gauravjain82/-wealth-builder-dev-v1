/**
 * The plug-in fees sections embedded in the Settings page. Reads `my-access/` to decide
 * which sections this user may use and `me/` for their data, and renders nothing for a
 * user who may submit none of them. Also handles the Stripe return (`?fee_pm=`), polling
 * `me/` briefly until the webhook-saved method appears.
 *
 * Flows and states: `docs/plugin-fees/ARCHITECTURE.md` §3 and `docs/plugin-fees/UI.md` §2.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useToastStore } from '@/store';

import { pluginFeesKeys, useMyPluginFees, usePluginFeesAccess } from '../hooks/use-plugin-fees';
import { canSeeOwnStatement } from '../utils/plugin-fees-access';
import { AssistantSection } from './assistant-section';
import { OfficeSection } from './office-section';
import { PaymentMethodSection } from './payment-method-section';
import './plugin-fees.css';

/** Stripe's webhook usually lands within seconds; poll this often, for this long. */
const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 30000;

export function PluginFeesSettingsSections() {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const handledReturn = useRef<string | null>(null);

  const access = usePluginFeesAccess();
  const canOffice = Boolean(access.data?.can_submit_office);
  const canAssistant = Boolean(access.data?.can_submit_assistant);
  const canPay = Boolean(access.data?.can_save_payment_method);
  const anything = canOffice || canAssistant || canPay;
  const billable = canSeeOwnStatement(access.data);

  const polling = pollStartedAt !== null;
  const me = useMyPluginFees(anything, polling ? POLL_EVERY_MS : false);
  const paymentStatus = me.data?.payment_method?.status;

  // The Stripe return: toast, start polling on success, and clean the URL.
  useEffect(() => {
    const result = searchParams.get('fee_pm');
    if (!result) return;
    if (handledReturn.current !== result) {
      handledReturn.current = result;
      if (result === 'success') {
        addToast({
          type: 'success',
          message: 'Payment method submitted. It will appear here once Stripe confirms it.',
        });
        setPollStartedAt(Date.now());
        void queryClient.invalidateQueries({ queryKey: pluginFeesKeys.me });
      } else if (result === 'cancelled') {
        addToast({ type: 'info', message: 'Payment method setup was cancelled.' });
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete('fee_pm');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient, addToast]);

  // Stop polling once Stripe has answered (saved, waiting on micro-deposits, or
  // failed), or after POLL_FOR_MS.
  useEffect(() => {
    if (pollStartedAt === null) return undefined;
    if (paymentStatus === 'saved' || paymentStatus === 'pending_verification' || paymentStatus === 'failed') {
      setPollStartedAt(null);
      return undefined;
    }
    const remaining = Math.max(0, POLL_FOR_MS - (Date.now() - pollStartedAt));
    const timer = window.setTimeout(() => {
      setPollStartedAt(null);
      addToast({
        type: 'info',
        message: 'Stripe has not confirmed your payment method yet. Refresh this page in a minute.',
      });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [pollStartedAt, paymentStatus, addToast]);

  if (access.isLoading || access.isError || !anything) return null;

  if (me.isLoading) {
    return (
      <div className="glass-section">
        <p className="wb-pf-muted">Loading plug-in fee details…</p>
      </div>
    );
  }

  if (me.isError || !me.data) {
    return (
      <div className="glass-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="title-icon">🏢</span>
            Plug-in Fees
          </h3>
        </div>
        <p className="wb-pf-muted">Unable to load your office, assistant and payment details.</p>
        <div className="connected-account-actions">
          <button type="button" className="btn-secondary" onClick={() => void me.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const data = me.data;

  return (
    <>
      {canOffice && data.office ? <OfficeSection office={data.office} rates={data.rates} /> : null}
      {canAssistant && data.assistant ? (
        <AssistantSection
          assistant={data.assistant}
          verificationDeadline={data.deadlines.assistant_verification}
        />
      ) : null}
      {canPay && data.payment_method ? (
        <PaymentMethodSection paymentMethod={data.payment_method} waitingForStripe={polling} />
      ) : null}
      {billable ? (
        <p className="wb-pf-statement-link">
          <Link to="/plugin-fees/statement" className="wb-pf-link">
            View statement of account →
          </Link>
        </p>
      ) : null}
    </>
  );
}
