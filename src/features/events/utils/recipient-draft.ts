import type { PersonSearchHit } from '../types/ticket';

/** What the manager has said about the person a ticket is going to. */
export interface RecipientDraft {
  /** The account picked from the search, or `null` when typing someone in. */
  person: PersonSearchHit | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Add a typed-in person as a prospect (when nobody matches on the server). */
  createProspect: boolean;
}

export const EMPTY_RECIPIENT: RecipientDraft = {
  person: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  createProspect: true,
};

/** The draft as the hand-over / transfer endpoints read it. */
export interface RecipientFields {
  to_user_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  create_prospect?: boolean;
  update_contact?: boolean;
}

/**
 * Turn a draft into request fields. An agent is sent by id alone — the server
 * fills their name and contact and never changes them. A prospect is sent with
 * the details as edited, and `update_contact` when any of them changed.
 */
export function recipientFields(draft: RecipientDraft): RecipientFields {
  const typed = {
    first_name: draft.firstName.trim(),
    last_name: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
  };
  const { person } = draft;
  if (!person) return { ...typed, create_prospect: draft.createProspect };
  if (person.kind === 'agent') {
    // An agent with no email on file still needs one to be sent the ticket;
    // it goes on the ticket only.
    return { to_user_id: person.id, first_name: '', last_name: '', email: person.has_email ? '' : typed.email, phone: '' };
  }
  const changed =
    typed.first_name !== person.first_name ||
    typed.last_name !== person.last_name ||
    typed.email !== person.email ||
    typed.phone !== person.phone;
  return { to_user_id: person.id, ...typed, update_contact: changed };
}
