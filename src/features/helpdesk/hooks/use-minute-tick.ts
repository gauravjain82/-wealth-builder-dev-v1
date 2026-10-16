/** One shared once-a-minute clock for relative times (SLA badges), not a timer per row. */

import { useSyncExternalStore } from 'react';

const TICK_MS = 60 * 1000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

/** Subscribe to the shared tick; the interval runs only while someone listens. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Current snapshot of the shared clock. */
function getSnapshot(): number {
  return now;
}

/** Current time in ms, re-rendering subscribers once a minute. */
export function useMinuteTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
