// Types for the Phase 5 post-sale surface: recognition, email blasts,
// attendee questions, per-event permissions, and the escrow finance report.
// Interfaces mirror the DRF serializer shapes exactly. Decimal fields arrive as
// strings from DRF.

export interface RecognitionCategory {
  id: number;
  event: number;
  parent: number | null;
  name: string;
  sort_order: number;
  award_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecognitionAward {
  id: number;
  event: number;
  category: number;
  category_name: string;
  recipient_user: number | null;
  recipient_name: string;
  agent_code: string;
  rank: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type BlastStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';

export type BlastAudience = 'holders' | 'purchasers' | 'owners';

export interface BlastRecipientFilter {
  audience?: BlastAudience;
  assignment_status?: string[];
  checked_in?: boolean;
  seller_id?: number;
}

export interface EmailBlast {
  id: number;
  event: number;
  subject: string;
  content: string;
  attachments: unknown[];
  recipient_filter: BlastRecipientFilter;
  status: BlastStatus;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlastRecipientPreview {
  count: number;
  preview: Array<{ email: string; name: string }>;
}

export type QuestionStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export interface EventQuestion {
  id: number;
  uuid: string;
  event: number;
  asker_user: number | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: QuestionStatus;
  answer: string;
  answered_by: number | null;
  answered_by_detail: { id: number; name: string; email: string } | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PermissionScope = 'EVENT' | 'PURCHASE' | 'CHECKIN' | 'QUESTION';

export interface EventPermissionGrant {
  id: number;
  event: number;
  user: number;
  user_detail: {
    id: number;
    name: string;
    email: string;
    agency_code: string;
  } | null;
  scope: PermissionScope;
  created_at: string;
  updated_at: string;
}

export interface EscrowReport {
  collected: string;
  pending: string;
  projected: string;
  refunded: string;
  escrow_balance: string;
  currency: string;
  pending_count: number;
  unassigned_smd_count: number;
  order_count: number;
}
