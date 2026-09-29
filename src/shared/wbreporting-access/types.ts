/**
 * The full payload of `GET /api/wbreporting/my-access/` (`wbreporting/views.py`,
 * `MyAccessView`). One response serves the shell menu, the pipeline screen,
 * leaderboards, Home v2 and contests, which is why it lives here and not in any one
 * of those modules.
 */
export interface WbReportingAccess {
  /** `wbreporting:read` (or `:manage`) — the pipeline admin screen. */
  can_view: boolean;
  /** `wbreporting:manage` — pipeline jobs, contest settings, leaderboard settings. */
  can_manage: boolean;
  /** `homev2:read` (or `:manage`) — Home v2 and the leaderboard routes. */
  can_view_leaderboards: boolean;
  /**
   * Reads the same grant as `can_view_leaderboards` today (decision C11), but stays a
   * separate flag so the two can split without a client change.
   */
  can_view_contests: boolean;
}
