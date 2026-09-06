/**
 * BuilderDashboardPage — the single Builder AI dashboard (Decision 31). One page with
 * an `Individual | BaseShop | SuperBase | SuperTeam` segment toggle (role-gated,
 * configurably labelled) that flips the tier in place. Replaces the former separate
 * Home / Company / BaseShop pages. Thin page: all layout and data flow live in
 * DashboardView (Decision 24 — thin views, fat services).
 */

import { DashboardView } from '../components/dashboard-view';

/** Render the Builder AI dashboard with its in-place segment toggle. */
export default function BuilderDashboardPage() {
  return <DashboardView title="Dashboard" allowRemove />;
}
