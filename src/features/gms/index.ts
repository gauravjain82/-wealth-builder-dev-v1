/**
 * Public surface of the Guidance feature.
 *
 * A host tool needs two things and nothing else: `HelpAction` to offer help on a page,
 * and `emit` / `gmsTarget` to make its controls observable. Everything else — the
 * drawer, the overlay, the services, the runtime state — is internal, so a tool cannot
 * reach past the adapter boundary even by importing something it should not.
 */

export { HelpAction } from './components/help-action';
export { emit, gmsTarget, isAdapterAttached } from './services/gms-adapter';
export { useGmsAccess } from './hooks/use-gms';
export type { GmsAccess, GmsSignal } from './types';
