/**
 * BuilderHomePage — the viewer's personal Builder analytics (INDIVIDUAL segment),
 * with an in-place control to widen to BaseShop/Company. Thin page: all layout
 * and data flow lives in DashboardView (Decision 24 — thin views, fat services).
 */

import { DashboardView } from '../components/dashboard-view';

/** Render the Builder AI Home dashboard. */
export default function BuilderHomePage() {
  return <DashboardView title="Home" initialScope="home" />;
}
