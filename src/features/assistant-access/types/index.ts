/**
 * Types for the SMD assistant-access API (`/api/assistant-access/`).
 * Contract: `mlm_platform/docs/assistant_access/DESIGN.md` § API.
 */

export type AssistantAccessStatus = 'invited' | 'active' | 'blocked' | 'revoked';

/** Why an access is `blocked`; only one reason exists today. */
export type AssistantBlockedReason = 'email_is_agent_account' | string;

/** The SMD's own assistant login, as returned by `GET me/`. */
export interface AssistantAccess {
  id: number;
  status: AssistantAccessStatus;
  blocked_reason: AssistantBlockedReason | '' | null;
  assistant_name: string;
  assistant_email: string;
  invited_at: string | null;
  invite_expires_at: string | null;
  activated_at: string | null;
  revoked_at: string | null;
}

export interface AssistantAccessMeResponse {
  access: AssistantAccess | null;
}

/** Public `GET invite/?token=` answer for a live invite (an unknown token answers 404). */
export interface AssistantInvitePreview {
  valid: boolean;
  assistant_name: string;
  assistant_email: string;
  principal_name: string;
}

export interface AssistantInviteAcceptInput {
  token: string;
  password: string;
}

export interface AssistantAccessDetailResponse {
  detail?: string;
}
