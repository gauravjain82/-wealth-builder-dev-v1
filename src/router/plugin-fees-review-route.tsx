import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

import { usePluginFeesAccess } from '@/features/plugin-fees/hooks/use-plugin-fees';
import type { PluginFeesAccess } from '@/features/plugin-fees/types';
import { canSeeReviews } from '@/features/plugin-fees/utils/plugin-fees-access';

interface PluginFeesAccessRouteProps {
  /** Whether `my-access/` lets this user see the page (`utils/plugin-fees-access.ts`). */
  allow: (access: PluginFeesAccess) => boolean;
  children: ReactNode;
}

/**
 * Route guard for every plug-in fees page, parameterised by a predicate over
 * `/api/plugin-fees/my-access/` — the statement (`is_billable`), the review queues
 * (`can_review`), billing cycles, costs and the agent statement lookup.
 *
 * While the check is in flight we render a loader; anyone the predicate refuses (or for
 * whom `my-access/` fails) is redirected to /home. This decides rendering only — every
 * endpoint re-checks its own capability (docs/plugin-fees/ARCHITECTURE.md §6).
 */
export function PluginFeesAccessRoute({ allow, children }: PluginFeesAccessRouteProps) {
  const { data, isLoading, isError } = usePluginFeesAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isError || !data || !allow(data)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

interface PluginFeesReviewRouteProps {
  children: ReactNode;
}

/**
 * Route guard for the Hierarchy Assistant review queues (offices and assistants):
 * `my-access/`.can_review (`plugin_fees:review`).
 */
export function PluginFeesReviewRoute({ children }: PluginFeesReviewRouteProps) {
  return <PluginFeesAccessRoute allow={canSeeReviews}>{children}</PluginFeesAccessRoute>;
}
