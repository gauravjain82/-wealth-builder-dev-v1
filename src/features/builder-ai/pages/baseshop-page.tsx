/**
 * BuilderBaseShopPage — baseshop-scope dashboard (BASESHOP segment): the same
 * widgets and roster clipped to the viewer's baseshop slice. "BaseShop Builder"
 * is a segment name, not a role (Decision 6).
 */

import { DashboardView } from '../components/dashboard-view';

/** Render the Builder AI BaseShop dashboard. */
export default function BuilderBaseShopPage() {
  return <DashboardView title="BaseShop" initialScope="baseshop" allowRemove />;
}
