import type {
  AddGuestPayload,
  AssociateCheckIn,
  AssociateInviteFilters,
  BPMAssociateInviteRow,
  BPMAssociateInviteState,
  BPMEmailTemplate,
  BPMEventAttachment,
  BPMStatusOverride,
  DistinctLocations,
  BPMEventDetail,
  BPMEventListItem,
  BPMEventPayload,
  BPMGuest,
  BPMCapabilities,
  BPMInterestGroup,
  BPMInterestOption,
  BPMInterestOptionPayload,
  BPMOccurrence,
  BPMQrScanResult,
  BPMQrToken,
  BPMRowColorRule,
  BPMRowColorRulePayload,
  BPMGuestMessageRow,
  BPMSendPayload,
  BPMSendReport,
  BPMSettings,
  BPMSettingsPayload,
  BPMSmsTemplate,
  EventFilters,
  GoogleStatus,
  CheckinAudience,
  CheckinDimension,
  CheckinStats,
  GuestCheckinOutcomeField,
  GuestFlagField,
  GuestInviteOutcomeField,
  ProspectMatch,
  GuestProspectSearchHit,
  InviterSearchHit,
  OccurrenceFilters,
  Office,
  OfficePayload,
  PaginatedResponse,
  ProspectSearchHit,
  SaveGuestFollowupPayload,
  UserRef,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function authHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function parseError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return fallback;
  if ('detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (typeof detail === 'string') return detail;
  }
  const firstFieldError = Object.entries(data as Record<string, unknown>).find(([, value]) => {
    return Array.isArray(value) || typeof value === 'string';
  });
  if (!firstFieldError) return fallback;
  const [field, value] = firstFieldError;
  return Array.isArray(value) ? `${field}: ${value.join(', ')}` : `${field}: ${value}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(init?.body !== undefined),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

export function supportedTimezones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

export function formatOccurrenceTime(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(new Date(value));
}

export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

/**
 * Slug of the appointment type a BPM follow-up is booked as (decision D3 —
 * *"this is a step 1 appointment, check it"*). Seeded by matchup migration
 * `0007`; both the 1on1 and Blue Card prefills pre-check it.
 *
 * Looked up by slug rather than id: ids differ per environment, and renaming
 * the type in admin must not silently stop the box being ticked.
 */
export const STEP_ONE_TYPE_SLUG = 'follow-up-step-1';

/** Id of the step-1 appointment type in a loaded list, or null if absent. */
export function findStepOneTypeId(types: { id: number; slug: string }[]): number | null {
  return types.find((type) => type.slug === STEP_ONE_TYPE_SLUG)?.id ?? null;
}

/**
 * The Outcome column on **Guest Invites** — how the pre-event contact went.
 *
 * There are deliberately two lists rather than one. The backend's
 * `set-guest-flags` takes the union (see `GuestFlagField`), but each screen
 * renders only its own: Guest Invites is worked from a phone days beforehand,
 * Guest Check-In is worked at the door. Widening one list to cover both would
 * put "Left Message" in front of someone taking names at a door.
 */
export const INVITE_OUTCOME_FIELDS: { field: GuestInviteOutcomeField; label: string }[] = [
  { field: 'called', label: 'Called' },
  { field: 'left_message', label: 'Left Message' },
  { field: 'not_interested', label: 'Not Interested' },
  { field: 'reschedule', label: 'Reschedule' },
];

/** The Outcome column on **Guest Check-In** — what happened on the night. */
export const CHECKIN_OUTCOME_FIELDS: { field: GuestCheckinOutcomeField; label: string }[] = [
  { field: 'late', label: 'Late' },
  { field: 'stayed_after', label: 'Stayed after' },
  { field: 'blue_card', label: 'Blue card' },
  { field: 'scheduled_appointment', label: 'Scheduled Appointment' },
];

export const bpmService = {
  // -- offices -------------------------------------------------------------
  offices: (search = '') =>
    request<PaginatedResponse<Office>>(`/api/bpm/offices/${buildQuery({ search, page_size: 100 })}`),
  createOffice: (payload: OfficePayload) =>
    request<Office>('/api/bpm/offices/', { method: 'POST', body: JSON.stringify(payload) }),
  updateOffice: (id: number, payload: Partial<OfficePayload>) =>
    request<Office>(`/api/bpm/offices/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteOffice: (id: number) =>
    request<void>(`/api/bpm/offices/${id}/`, { method: 'DELETE' }),

  // -- email templates -----------------------------------------------------
  emailTemplates: () =>
    request<PaginatedResponse<BPMEmailTemplate>>('/api/bpm/email-templates/'),

  // -- interest options (follow-up catalog) --------------------------------
  // Read is open to any authed user; write requires bpm_templates:manage.
  // The endpoint may return a bare array or a paginated envelope — normalize to an array.
  interestOptions: async (params: { group?: BPMInterestGroup; is_active?: boolean; ordering?: string } = {}) => {
    const data = await request<BPMInterestOption[] | PaginatedResponse<BPMInterestOption>>(
      `/api/bpm/interest-options/${buildQuery({
        group: params.group,
        is_active: params.is_active,
        ordering: params.ordering,
      })}`,
    );
    return Array.isArray(data) ? data : data.results;
  },
  createInterestOption: (payload: BPMInterestOptionPayload) =>
    request<BPMInterestOption>('/api/bpm/interest-options/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateInterestOption: (id: number, payload: BPMInterestOptionPayload) =>
    request<BPMInterestOption>(`/api/bpm/interest-options/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteInterestOption: (id: number) =>
    request<void>(`/api/bpm/interest-options/${id}/`, { method: 'DELETE' }),

  // -- events --------------------------------------------------------------
  events: (filters: EventFilters = {}) =>
    request<PaginatedResponse<BPMEventListItem>>(
      `/api/bpm/events/${buildQuery({
        event_type: filters.event_type,
        bpm_format: filters.bpm_format,
        is_active: filters.is_active,
        search: filters.search,
        city: filters.city,
        state: filters.state,
        segment: filters.segment,
        ordering: filters.ordering,
        include_concealed: filters.include_concealed ? 1 : undefined,
        page: filters.page,
        page_size: filters.page_size,
      })}`,
    ),
  // Current user's BPM action permissions, for gating UI controls.
  capabilities: () => request<BPMCapabilities>('/api/bpm/events/capabilities/'),
  // Every SMD company-wide, for the "Select all SMDs" button in the BPM form.
  smdRoster: () => request<UserRef[]>('/api/bpm/events/smd-roster/'),
  event: (id: number) => request<BPMEventDetail>(`/api/bpm/events/${id}/`),
  createEvent: (payload: BPMEventPayload) =>
    request<BPMEventDetail>('/api/bpm/events/', { method: 'POST', body: JSON.stringify(payload) }),
  updateEvent: (id: number, payload: Partial<BPMEventPayload>) =>
    request<BPMEventDetail>(`/api/bpm/events/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteEvent: (id: number) =>
    request<void>(`/api/bpm/events/${id}/`, { method: 'DELETE' }),

  // -- status (BPM Schedule) -----------------------------------------------
  /** Hard-set a BPM's status, or pass null to let it derive from the clock. */
  setEventStatus: (id: number, statusOverride: BPMStatusOverride | null) =>
    request<BPMEventDetail>(`/api/bpm/events/${id}/set-status/`, {
      method: 'POST',
      body: JSON.stringify({ status_override: statusOverride }),
    }),
  /** Hard-set one date's status; it wins over the BPM-level status. */
  setOccurrenceStatus: (id: number, statusOverride: BPMStatusOverride | null) =>
    request<BPMOccurrence>(`/api/bpm/occurrences/${id}/set-status/`, {
      method: 'POST',
      body: JSON.stringify({ status_override: statusOverride }),
    }),

  // -- BPM Settings: deleted-item recovery ---------------------------------
  deletedEvents: () => request<BPMEventListItem[]>('/api/bpm/events/deleted/'),
  undeleteEvent: (id: number) =>
    request<BPMEventDetail>(`/api/bpm/events/${id}/undelete/`, { method: 'POST' }),

  // -- BPM Settings: the switchboard ---------------------------------------
  // A singleton, so there is no id and no list. Reading is open to any BPM
  // reader — `attachments_download` and the check-in window decide what an
  // ordinary user's screen renders — while writing needs bpm_settings:manage.
  settings: () => request<BPMSettings>('/api/bpm/settings/'),
  updateSettings: (payload: BPMSettingsPayload) =>
    request<BPMSettings>('/api/bpm/settings/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // -- Sending the event to guests -----------------------------------------
  // D5's sender, added after Phase 7 shipped the switches. Gated server-side on
  // `email_event_to_guests` / `text_event_to_guests`, so a refusal arrives as a
  // sentence naming the switch to flip.

  /** The reusable SMS bodies, for the send modal's picker.
   *  (The email side reuses `emailTemplates` above — it already existed.) */
  smsTemplates: () =>
    request<PaginatedResponse<BPMSmsTemplate>>(
      `/api/bpm/sms-templates/${buildQuery({ page_size: 100 })}`,
    ),

  /**
   * Every message attempt against one guest on this date, newest first.
   *
   * The detail behind the count on the row. Includes skips and failures, because
   * "we tried and they have no phone number" is what somebody needs *before*
   * trying the same thing again.
   */
  guestMessages: (occurrenceId: number, guestId: number) =>
    request<BPMGuestMessageRow[]>(
      `/api/bpm/occurrences/${occurrenceId}/guest-messages/${buildQuery({ guest_id: guestId })}`,
    ),

  /**
   * Send this date's details to the chosen guests.
   *
   * Recipients are always explicit — there is no "everyone on this date"
   * shorthand, by design. The response reports one outcome **per guest per
   * channel**, because a guest with no email is something the sender has to act
   * on and must not read as the whole send having failed.
   */
  sendEventToGuests: (occurrenceId: number, payload: BPMSendPayload) =>
    request<BPMSendReport>(
      `/api/bpm/occurrences/${occurrenceId}/send-event-to-guests/`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  // -- QR check-in ---------------------------------------------------------
  // Two codes pointing opposite ways, and one endpoint that resolves either —
  // the scanner does not know which code it just read, so the token decides.

  /**
   * The caller's own permanent identity code, minted on first request (D6).
   *
   * Needs no BPM permission: it is the caller's own code, and somebody whose
   * only role at a door is to *be* scanned must still be able to show it.
   */
  myQrIdentity: () => request<BPMQrToken>('/api/bpm/qr/my-identity/'),

  /**
   * Reissue the caller's identity code, invalidating the previous one at once.
   *
   * The escape hatch for a permanent token (D6): scoped to the caller, because
   * the token is not the user id and so nobody else's code changes.
   */
  regenerateQrIdentity: () =>
    request<BPMQrToken>('/api/bpm/qr/regenerate/', { method: 'POST' }),

  /** This date's check-in code, for the screen in the room. */
  occurrenceQr: (occurrenceId: number) =>
    request<BPMQrToken>(`/api/bpm/occurrences/${occurrenceId}/qr/`),

  /**
   * Submit a scanned payload; the server works out who to check in.
   *
   * `occurrenceId` is only consulted when an *identity* code was scanned — an
   * event code names its own room — so it is optional, which is what lets the
   * profile-menu scanner work with no BPM selected.
   *
   * The payload is passed through untouched: the resolver pulls a token out of
   * whatever it is given, so the client never parses and a URL-shaped code keeps
   * working if one is ever introduced.
   */
  scanQr: (scan: string, occurrenceId?: number | null) =>
    request<BPMQrScanResult>('/api/bpm/qr/scan/', {
      method: 'POST',
      body: JSON.stringify(
        occurrenceId ? { scan, occurrence_id: occurrenceId } : { scan },
      ),
    }),

  // -- BPM Settings: row colours -------------------------------------------
  // Reading is open to everyone because every list render needs the rules.
  // The endpoint is unpaginated: the rule set is a handful of rows by nature.
  rowColorRules: () => request<BPMRowColorRule[]>('/api/bpm/row-color-rules/'),
  createRowColorRule: (payload: BPMRowColorRulePayload) =>
    request<BPMRowColorRule>('/api/bpm/row-color-rules/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateRowColorRule: (id: number, payload: Partial<BPMRowColorRulePayload>) =>
    request<BPMRowColorRule>(`/api/bpm/row-color-rules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteRowColorRule: (id: number) =>
    request<void>(`/api/bpm/row-color-rules/${id}/`, { method: 'DELETE' }),

  // -- attachments (event flyer) -------------------------------------------
  // Uploaded straight to the CDN; the returned `href` is a permanent URL the
  // client fetches directly, so there is no download endpoint here.
  uploadAttachment: async (eventId: number, file: File) => {
    const body = new FormData();
    body.append('file', file);
    // Content-Type is omitted so the browser sets the multipart boundary.
    const response = await fetch(
      `${API_BASE_URL}/api/bpm/events/${eventId}/upload-attachment/`,
      { method: 'POST', headers: authHeaders(false), body },
    );
    if (!response.ok) throw new Error(await parseError(response));
    return (await response.json()) as BPMEventAttachment;
  },
  deleteAttachment: (eventId: number, attachmentId: number) =>
    request<{ removed: boolean }>(
      `/api/bpm/events/${eventId}/attachments/${attachmentId}/`,
      { method: 'DELETE' },
    ),
  eventOccurrences: (id: number) =>
    request<BPMOccurrence[]>(`/api/bpm/events/${id}/occurrences/`),

  // -- occurrences ---------------------------------------------------------
  occurrences: (filters: OccurrenceFilters = {}) =>
    request<PaginatedResponse<BPMOccurrence>>(
      `/api/bpm/occurrences/${buildQuery({
        event: filters.event,
        status: filters.status,
        date: filters.date,
        start_after: filters.start_after,
        start_before: filters.start_before,
        city: filters.city,
        state: filters.state,
        bpm_format: filters.bpm_format,
        segment: filters.segment,
        search: filters.search,
        include_concealed: filters.include_concealed ? 1 : undefined,
        page: filters.page,
        page_size: filters.page_size,
      })}`,
    ),
  occurrence: (id: number) => request<BPMOccurrence>(`/api/bpm/occurrences/${id}/`),
  /**
   * City / state options for the Overview filters — only places that actually
   * have BPMs in the window on screen. Takes the same filters as `occurrences`
   * so the options always describe the list being viewed.
   */
  distinctLocations: (filters: OccurrenceFilters = {}) =>
    request<DistinctLocations>(
      `/api/bpm/occurrences/distinct-locations/${buildQuery({
        start_after: filters.start_after,
        start_before: filters.start_before,
        segment: filters.segment,
        search: filters.search,
      })}`,
    ),

  guests: (occurrenceId: number) =>
    request<BPMGuest[]>(`/api/bpm/occurrences/${occurrenceId}/guests/`),
  // Reception pickers: inviter is company-wide; guests are that inviter's BaseShop.
  searchInviters: (q: string, limit = 25) =>
    request<InviterSearchHit[]>(`/api/bpm/inviter-search/${buildQuery({ q, limit })}`),
  searchGuests: (inviterId: number, q: string, limit = 25) =>
    request<GuestProspectSearchHit[]>(
      `/api/bpm/guest-search/${buildQuery({ inviter_id: inviterId, q, limit })}`,
    ),
  // Company-wide prospect lookup for Guest Check-In (not downline-scoped).
  searchProspects: (q: string, limit = 10) =>
    request<ProspectSearchHit[]>(`/api/bpm/prospect-search/${buildQuery({ q, limit })}`),
  addGuest: (occurrenceId: number, payload: AddGuestPayload) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/add-guest/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeGuest: (occurrenceId: number, guestId: number) =>
    request<{ removed: boolean }>(`/api/bpm/occurrences/${occurrenceId}/remove-guest/`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    }),
  transferGuest: (
    occurrenceId: number,
    payload: { guest_id: number; to_occurrence_id: number; reason?: string },
  ) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/transfer-guest/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  setGuestFlags: (
    occurrenceId: number,
    payload: { guest_id: number } & Partial<Record<GuestFlagField, boolean>>,
  ) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/set-guest-flags/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /**
   * Move a guest on to another date. Unlike `transferGuest` the source row stays
   * put and is marked rescheduled, so both rows come back.
   */
  rescheduleGuest: (
    occurrenceId: number,
    payload: { guest_id: number; to_occurrence_id: number },
  ) =>
    request<{ guest: BPMGuest; created: BPMGuest }>(
      `/api/bpm/occurrences/${occurrenceId}/reschedule-guest/`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  /** Link the 1-on-1 a guest was moved to (booked through Match Up). */
  rescheduleGuestToAppointment: (
    occurrenceId: number,
    payload: { guest_id: number; appointment_id: number },
  ) =>
    request<BPMGuest>(
      `/api/bpm/occurrences/${occurrenceId}/reschedule-guest-to-appointment/`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  addGuestNote: (occurrenceId: number, payload: { guest_id: number; text: string }) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/add-guest-note/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  saveGuestFollowup: (occurrenceId: number, payload: SaveGuestFollowupPayload) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/save-guest-followup/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkInGuest: (occurrenceId: number, guestId: number) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/check-in-guest/`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    }),
  undoCheckInGuest: (occurrenceId: number, guestId: number) =>
    request<BPMGuest>(`/api/bpm/occurrences/${occurrenceId}/undo-check-in-guest/`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    }),
  checkInAssociate: (occurrenceId: number, userId: number) =>
    request<AssociateCheckIn>(`/api/bpm/occurrences/${occurrenceId}/check-in-associate/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  undoCheckInAssociate: (occurrenceId: number, userId: number) =>
    request<{ removed: boolean }>(`/api/bpm/occurrences/${occurrenceId}/undo-check-in-associate/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  associateCheckins: (occurrenceId: number) =>
    request<AssociateCheckIn[]>(`/api/bpm/occurrences/${occurrenceId}/associate-checkins/`),
  /**
   * The team, with one date's invite state joined on — the Associate Invites
   * list, and the Invited Associates panel on Associate Check-In (`invited=true`).
   *
   * Paginated and filtered server-side because it spans a whole downline, which
   * is a much larger population than a guest list. `filters` carries the
   * Associate Tracker's own vocabulary (name / recruiter_name / leader_name /
   * broker_id / from_date / to_date) plus `invited` / `called`.
   */
  associateInvites: ({ occurrence, sort, segment, page, page_size, filters = {} }: AssociateInviteFilters) =>
    request<PaginatedResponse<BPMAssociateInviteRow>>(
      `/api/bpm/associate-invites/${buildQuery({
        occurrence,
        sort,
        segment,
        page,
        page_size,
        ...filters,
      })}`,
    ),
  /**
   * Tick (or untick) one associate's invited / called box for one date.
   *
   * One setter for both flags, mirroring `setGuestFlags`: only the keys sent are
   * written, so a screen can flip one box without asserting the other.
   */
  setAssociateInviteFlags: (
    payload: { occurrence_id: number; user_id: number } & Partial<{ invited: boolean; called: boolean }>,
  ) =>
    request<BPMAssociateInviteState>('/api/bpm/associate-invites/set-flags/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /**
   * Leaderboards behind the cards on both check-in screens.
   *
   * Called without a `dimension` the response carries every ranking, which is
   * one request for all four cards *and* the lists their modals show — so
   * opening a card is instant. Pass a `dimension` to refresh just one.
   */
  checkinStats: (
    occurrenceId: number,
    audience: CheckinAudience = 'guest',
    dimension?: CheckinDimension,
  ) =>
    request<CheckinStats>(
      `/api/bpm/occurrences/${occurrenceId}/checkin-stats/${buildQuery({ audience, dimension })}`,
    ),
  /**
   * Whether a typed email/phone already belongs to somebody (D9).
   *
   * Backs the "possible duplicate — is this them?" confirm. It calls the same
   * matcher the add path uses, so the confirm can never disagree with what the
   * add would actually have done.
   */
  matchProspect: (params: { email?: string; phone?: string }) =>
    request<ProspectMatch>(
      `/api/bpm/prospect-match/${buildQuery({ email: params.email, phone: params.phone })}`,
    ),
  cancelOccurrence: (occurrenceId: number) =>
    request<BPMOccurrence>(`/api/bpm/occurrences/${occurrenceId}/cancel/`, { method: 'POST' }),
  completeOccurrence: (occurrenceId: number) =>
    request<BPMOccurrence>(`/api/bpm/occurrences/${occurrenceId}/complete/`, { method: 'POST' }),
  /** Restore a cancelled/completed occurrence to SCHEDULED. */
  rescheduleOccurrence: (occurrenceId: number) =>
    request<BPMOccurrence>(`/api/bpm/occurrences/${occurrenceId}/reschedule/`, { method: 'POST' }),

  // -- google calendar -----------------------------------------------------
  // BPM reuses the Match Up OAuth credential store: one Google connection per
  // user grants both calendars (the Match Up authorization already requests the
  // calendar.app.created scope the BPM "BPM" calendar needs). So the connect /
  // status / disconnect flow points at the shared Match Up endpoints.
  googleStatus: () => request<GoogleStatus>('/api/matchup/google/status/'),
  startGoogleOAuth: () =>
    request<{ authorization_url: string }>('/api/matchup/google/oauth/start/'),
  disconnectGoogle: () =>
    request<GoogleStatus>('/api/matchup/google/status/', { method: 'DELETE' }),
};
