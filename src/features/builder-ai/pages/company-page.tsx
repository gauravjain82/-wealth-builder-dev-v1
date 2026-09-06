/**
 * BuilderCompanyPage — company-scope dashboard (COMPANY segment): the viewer's
 * whole organisation, with the marathon split and size KPIs. Leaders may remove
 * builders directly from the roster here.
 */

import { DashboardView } from '../components/dashboard-view';

/** Render the Builder AI Company dashboard. */
export default function BuilderCompanyPage() {
  return <DashboardView title="Company" initialScope="company" allowRemove />;
}
