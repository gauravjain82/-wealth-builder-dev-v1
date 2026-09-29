/** Shell-level access to `/api/wbreporting/my-access/`, shared by every module that reads it. */

export { useWbReportingAccess, WB_REPORTING_ACCESS_KEY } from './use-wbreporting-access';
export type { WbReportingAccess } from './types';
