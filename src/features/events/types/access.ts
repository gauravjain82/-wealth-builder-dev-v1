// Which Big Event screens the viewer can open — GET /api/events/events/my-access/.
// Access from either layer counts: a platform-wide grant (role, level or a per-user
// override in Admin → User Permissions) opens a screen for every event the viewer
// can see; a per-event grant (Big Event → Permissions) opens it for that event.

/** A Big Event screen, as the backend names it in `events.permissions.SURFACES`. */
export type BigEventScreen =
  | 'builder'
  | 'purchases'
  | 'checkin'
  | 'recognition'
  | 'emails'
  | 'questions'
  | 'permissions';

export interface EventDelegation {
  event: number;
  /** The screens this event's per-event scopes open. */
  surfaces: BigEventScreen[];
}

export interface EventsAccess {
  /** Opens for at least one event: drives the sidebar. */
  surfaces: Record<BigEventScreen, boolean>;
  /** Opens for every event the viewer can see. */
  global_surfaces: Record<BigEventScreen, boolean>;
  delegations: EventDelegation[];
  can_create: boolean;
}
