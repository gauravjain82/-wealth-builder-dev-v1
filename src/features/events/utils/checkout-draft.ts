/**
 * Remembers what a buyer typed into the checkout form, on their own device.
 *
 * A refresh, a dropped connection or the phone closing the tab would otherwise
 * empty the form. The draft is kept in `localStorage` per event, read back
 * when the form mounts, and cleared once the purchase completes.
 *
 * Deliberately not kept: the refund-policy agreement (consent is given each
 * time), an applied promo (it is re-priced by the server on Apply — only the
 * typed code is kept), and anything about the card, which this app never sees.
 *
 * Everything read back is checked against the event as it is now, so a seller,
 * add-on or question removed since the draft was saved is dropped rather than
 * submitted. Storage can be unavailable (private mode, blocked site data); the
 * form then simply starts empty.
 */

import type { CheckoutAddOnSpec, PublicEvent } from '../types/public';

export interface CheckoutDraft {
  quantity: number;
  purchaser: {
    purchaser_first_name: string;
    purchaser_last_name: string;
    purchaser_email: string;
    purchaser_phone: string;
  };
  sellerId: number | null;
  addOns: CheckoutAddOnSpec[];
  customValues: Record<string, string | boolean>;
  promoCode: string;
}

/** A draft older than this is forgotten — the phone may have changed hands. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const storageKey = (shortcut: string) => `wb.event-checkout-draft.${shortcut}`;

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function saveCheckoutDraft(shortcut: string, draft: CheckoutDraft): void {
  try {
    localStorage.setItem(storageKey(shortcut), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage unavailable or full — the form just won't be remembered.
  }
}

export function clearCheckoutDraft(shortcut: string): void {
  try {
    localStorage.removeItem(storageKey(shortcut));
  } catch {
    // Nothing to clear.
  }
}

/** The saved draft, fitted to the event as it is now; `null` when there is none. */
export function loadCheckoutDraft(event: PublicEvent): CheckoutDraft | null {
  let raw: Record<string, unknown>;
  try {
    const stored = localStorage.getItem(storageKey(event.shortcut));
    if (!stored) return null;
    raw = JSON.parse(stored) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.savedAt !== 'number' || Date.now() - raw.savedAt > MAX_AGE_MS) {
    clearCheckoutDraft(event.shortcut);
    return null;
  }

  const purchaser = (raw.purchaser ?? {}) as Record<string, unknown>;
  const quantity = Number(raw.quantity);
  const max = Math.max(1, event.sales_state.max_per_order);
  const addOnIds = new Set(event.add_ons.map((addOn) => addOn.id));
  const fieldIds = new Set(event.custom_fields.map((field) => String(field.id)));

  return {
    quantity: Number.isInteger(quantity) ? Math.min(Math.max(1, quantity), max) : 1,
    purchaser: {
      purchaser_first_name: text(purchaser.purchaser_first_name),
      purchaser_last_name: text(purchaser.purchaser_last_name),
      purchaser_email: text(purchaser.purchaser_email),
      purchaser_phone: text(purchaser.purchaser_phone),
    },
    sellerId: event.sellers.some((seller) => seller.id === raw.sellerId)
      ? (raw.sellerId as number)
      : null,
    addOns: (Array.isArray(raw.addOns) ? (raw.addOns as CheckoutAddOnSpec[]) : []).filter(
      (line) =>
        line &&
        addOnIds.has(line.add_on_id) &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0,
    ),
    customValues: Object.fromEntries(
      Object.entries((raw.customValues ?? {}) as Record<string, unknown>).filter(
        ([id, value]) =>
          fieldIds.has(id) && (typeof value === 'string' || typeof value === 'boolean'),
      ),
    ) as Record<string, string | boolean>,
    promoCode: text(raw.promoCode),
  };
}
