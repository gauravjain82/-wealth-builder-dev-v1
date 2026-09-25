/**
 * The adapter boundary — decision G3, client half.
 *
 * A host tool tells GMS *that* something happened to a registered control. It never
 * tells GMS what the user typed, what the server returned, or what was saved.
 *
 * The enforcement is the signature, not a convention:
 *
 *     emit(targetKey: string, signal: GmsSignal): void
 *
 * There is no third parameter. A payload is not forbidden, it is **unrepresentable** —
 * TypeScript will not let a caller pass one, so an adapter cannot leak a guest's email
 * by being careless, only by someone deliberately changing this file. The backend
 * rejects unknown fields as well, so both halves of the boundary have to be dismantled
 * for a leak to happen.
 *
 * One host fact makes this credible rather than aspirational: BPM's own Add Guest
 * success hook is already `onAdded: () => void`. The response that carries the guest's
 * name, phone and email never reaches the callback the adapter listens to.
 *
 * **When GMS is absent, every call here is a no-op.** A BPM component may call `emit`
 * unconditionally — with GMS switched off, uninstalled, or failing to load, the tool
 * behaves exactly as it did before (decision G12, and `APPLICATION_CONTRACT.md`'s
 * failure-isolation rule).
 */

import type { AdapterSignal, GmsSignal } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Where a signal should be delivered, set by the walkthrough runtime while it runs. */
interface AdapterTarget {
  toolKey: string;
  topicKey: string;
  stepKey: string;
  /** Called after the server accepts a signal, so the overlay can advance. */
  onAccepted: () => void;
  /** Called when the server refuses — an incompatible target, or the wrong signal. */
  onRefused: (code: string, detail: string) => void;
}

/**
 * The single active listener. Null whenever no walkthrough is running, which is the
 * normal state and the reason `emit` is cheap.
 */
let activeTarget: AdapterTarget | null = null;

/** Register the running walkthrough as the recipient of adapter signals. */
export function attachAdapter(target: AdapterTarget): void {
  activeTarget = target;
}

/** Stop listening. Always called on unmount, so a stale overlay cannot receive signals. */
export function detachAdapter(): void {
  activeTarget = null;
}

/** Whether a walkthrough is currently listening. Components rarely need to ask. */
export function isAdapterAttached(): boolean {
  return activeTarget !== null;
}

/** RFC 4122 v4, via the platform where available. */
function newEventUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Report that something happened to a registered control.
 *
 * @param targetKey A stable key from the tool's `gms-targets.ts` manifest.
 * @param signal One of the seven allow-listed observations.
 *
 * Deliberately returns `void` and never throws. A tool calls this in the middle of its
 * own work — a failure to tell GMS about a save must never surface to the person doing
 * the saving, and must certainly never prevent it.
 */
export function emit(targetKey: string, signal: GmsSignal): void {
  const target = activeTarget;
  if (!target) return;

  // The envelope. Typed as AdapterSignal so adding a field here is a type error
  // somewhere rather than a silent widening of what leaves the browser.
  const body: AdapterSignal = {
    event_uuid: newEventUuid(),
    tool_key: target.toolKey,
    target_key: targetKey,
    signal,
    occurred_at: new Date().toISOString(),
  };

  void fetch(
    `${API_BASE_URL}/api/gms/walkthroughs/${target.toolKey}/${target.topicKey}/progress/`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...body, step_key: target.stepKey }),
    }
  )
    .then(async (response) => {
      if (response.ok) {
        target.onAccepted();
        return;
      }
      const failure = await response.json().catch(() => ({}));
      target.onRefused(failure?.code ?? 'invalid_input', failure?.detail ?? '');
    })
    .catch(() => {
      // Network failure. The walkthrough stalls on this step, which is correct: the
      // alternative is advancing on an action the server never confirmed.
    });
}

/**
 * A stable-target attribute for a host component.
 *
 * Spread onto an element that **already exists**:
 *
 *     <button {...gmsTarget(BPM_TARGETS.addGuestSave)} onClick={save}>Save</button>
 *
 * GMS never adds a wrapper element to a host component. That is the difference between
 * "add a stable attribute" — third in the package's own preference order — and
 * "extend an existing component", which decision G9 keeps out of this package.
 */
export function gmsTarget(targetKey: string): { 'data-gms-target': string } {
  return { 'data-gms-target': targetKey };
}
