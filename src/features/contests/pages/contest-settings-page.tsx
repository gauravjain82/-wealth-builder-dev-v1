/**
 * The contest settings route.
 *
 * Gated on `wbreporting:manage` by `ContestSettingsRoute`; the backend enforces the
 * same gate on every endpoint independently.
 */

import { ContestSettings } from '../components/contest-settings';

export default function ContestSettingsPage() {
  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-bold text-amber-400">Contest settings</h1>
      <ContestSettings />
    </div>
  );
}
