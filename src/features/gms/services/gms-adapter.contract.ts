/**
 * Compile-time assertions about the adapter boundary — decision G3, client half.
 *
 * **Why this file exists in this shape.** The constraint is "enforce that boundary with a
 * test, not a convention". This repository has no frontend test runner — no vitest, no
 * jest, no testing-library, and adding one is a toolchain decision well outside a help
 * feature's scope. So the enforcement available here is the type checker, which *does*
 * run in CI on every build (`npm run build` runs `tsc` first).
 *
 * These are real assertions: each one fails `tsc` if the boundary widens. What they
 * cannot do is assert runtime behaviour, so the runtime half of G3's five cases lives in
 * the backend suite (`gms/tests/test_adapter_boundary.py`), which does have a runner and
 * does include the end-to-end "no fragment of a guest's name, phone or email reached a
 * stored event" assertion.
 *
 * The gap that remains, stated rather than papered over: there is no automated test that
 * BPM renders and submits with GMS absent (decision G12). That property is structural —
 * `emit` returns immediately when nothing is attached, and `HelpAction` returns null
 * without the capability — but structural is not asserted. It is recorded in
 * `WB_GMS_PROGRESS.md` as the one piece of the plan this package could not deliver.
 *
 * Nothing here is imported at runtime; it exists to be type-checked.
 */

import { emit, gmsTarget } from './gms-adapter';
import type { AdapterSignal, GmsSignal } from '../types';

/** Fails to compile unless `T` and `U` are exactly the same type. */
type Exact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

/** Compile-time assertion helper. */
function assertType<T extends true>(_value?: T): void {
  /* no runtime behaviour; the constraint is the assertion */
}

// -- 1. The envelope is exactly five fields. ---------------------------------
//
// Adding one to `AdapterSignal` breaks this line, which is the point: widening the
// privacy boundary should not be possible without deleting an assertion that says so.
type EnvelopeKeys = keyof AdapterSignal;
assertType<
  Exact<EnvelopeKeys, 'event_uuid' | 'tool_key' | 'target_key' | 'signal' | 'occurred_at'>
>();

// -- 2. `emit` takes a target key and a signal. Nothing else. ----------------
//
// A payload is unrepresentable rather than merely forbidden: there is no third
// parameter for one to travel in.
assertType<Exact<Parameters<typeof emit>, [string, GmsSignal]>>();
assertType<Exact<Parameters<typeof emit>['length'], 2>>();

// -- 3. `emit` reports nothing back. -----------------------------------------
//
// A return value would be a second channel, and a caller awaiting one would couple a
// tool's own flow to whether guidance is listening.
assertType<Exact<ReturnType<typeof emit>, void>>();

// -- 4. The signal vocabulary is closed. -------------------------------------
assertType<
  Exact<GmsSignal, 'opened' | 'closed' | 'selected' | 'valid' | 'invalid' | 'saved' | 'failed'>
>();

// -- 5. `gmsTarget` produces one data attribute and no behaviour. ------------
assertType<Exact<ReturnType<typeof gmsTarget>, { 'data-gms-target': string }>>();

export {};
