// Door credentials: what a scan at the desk or a session door was recognised as,
// the structured refusals the backend returns, and the link-account action.
// Mirrors the backend's door resolver (`events` check-in + `checkin/link/`).

/** What the scanned / typed value turned out to be. */
export type DoorCredential =
  | 'WB_TICKET_QR'
  | 'PROFILE_QR'
  | 'PROVIDER_CONFIRMATION'
  | 'TICKET_NUMBER'
  | 'MANUAL';

/** Human labels for door staff. */
export const DOOR_CREDENTIAL_LABELS: Record<DoorCredential, string> = {
  WB_TICKET_QR: 'WB ticket QR',
  PROFILE_QR: 'Profile QR',
  PROVIDER_CONFIRMATION: 'BSCPro confirmation',
  TICKET_NUMBER: 'Ticket number',
  MANUAL: 'Manual',
};

/** Label for a credential value that may be blank or unknown to this build. */
export function credentialLabel(value: DoorCredential | '' | null | undefined): string {
  if (!value) return '';
  return DOOR_CREDENTIAL_LABELS[value] ?? value;
}

/** "BSCPro · c1550-140862" for partner tickets; '' for our own. */
export function sourceLabel(source: string | undefined, reference: string | undefined): string {
  if (source === 'BSCPRO') return reference ? `BSCPro · ${reference}` : 'BSCPro';
  return '';
}

export type DoorErrorCode =
  | 'not_found'
  | 'ambiguous'
  | 'no_linked_ticket'
  | 'on_hold'
  | 'wrong_event'
  | 'inactive'
  | 'no_contact_match'
  | 'linked_to_other'
  | 'account_has_ticket'
  | 'not_eligible'
  | 'window_closed'
  | 'session_error'
  | 'error';

/** Why a ticket was offered as a candidate. `name` is weak — check photo ID. */
export type DoorCandidateMatch = 'holder' | 'email' | 'phone' | 'name' | 'order' | 'reference';

export const DOOR_MATCH_LABELS: Record<DoorCandidateMatch, string> = {
  holder: 'Named holder',
  email: 'Email match',
  phone: 'Phone match',
  name: 'Name only — check ID',
  order: 'Same order',
  reference: 'Confirmation match',
};

/** A ticket the scan could mean. */
export interface DoorCandidate {
  ticket_id: number;
  ticket_number: string;
  holder_name: string;
  /** `NATIVE` | `BSCPRO`. */
  source: string;
  /** BSCPro confirmation number, or ''. */
  external_reference: string;
  checked_in: boolean;
  /** The ticket is already linked to an account. */
  holder_linked: boolean;
  match: DoorCandidateMatch;
}

/** The person behind a scanned profile QR. Contact details arrive masked. */
export interface DoorAccount {
  id: number;
  name: string;
  email_masked: string;
  phone_masked: string;
  agency_code: string;
}

export interface DoorHold {
  change_id: number | null;
  revision: number | null;
  reason: string;
}

/** HTTP 400 body from desk / session check-in and the link endpoint. */
export interface DoorErrorBody {
  detail: string;
  code: DoorErrorCode;
  overridable: boolean;
  credential?: DoorCredential;
  candidates?: DoorCandidate[];
  account?: DoorAccount;
  hold?: DoorHold;
}

/** `POST .../checkin/link/` — link a ticket to an account, then (by default) admit. */
export interface LinkAccountPayload {
  ticket_id: number;
  /** Exactly one of `user_id` / `profile_scan`. */
  user_id?: number;
  profile_scan?: string;
  admit?: boolean;
  /** Staff checked photo ID although neither email nor phone matches. */
  confirm_without_contact_match?: boolean;
  notes?: string;
  /** Admit into this session instead of at the desk. */
  session_id?: number;
}

/** Success from the link endpoint: the admitted row plus the link outcome. */
export interface LinkAccountResult {
  id: number;
  ticket_number: string;
  holder_name: string;
  checked_in_at: string | null;
  duplicate: boolean;
  credential: DoorCredential;
  warnings: string[];
  linked: boolean;
  match: 'email' | 'phone' | 'none' | 'holder';
}
