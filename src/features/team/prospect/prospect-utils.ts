import type { Prospect, UpdateProspectPayload } from './services/prospect-service';
import type { AddProspectFormData } from './types';

/**
 * Name, contact and hierarchy fields for a prospect edit — only those the user changed.
 *
 * The edit form is seeded from the list row, which can be hours old. Sending every field
 * wrote the row's recruiter, leader and phone back over anything changed since (by another
 * user, or by the backend's leader recalculation). Comparing against the form the row
 * produced sends only real edits.
 */
export function changedIdentityFields(
  initial: AddProspectFormData,
  form: AddProspectFormData
): Pick<UpdateProspectPayload, 'first_name' | 'last_name' | 'full_name' | 'email' | 'phone' | 'recruited_by' | 'leader'> {
  const payload: ReturnType<typeof changedIdentityFields> = {};
  if (form.firstName !== initial.firstName || form.lastName !== initial.lastName) {
    payload.first_name = form.firstName;
    payload.last_name = form.lastName;
    payload.full_name = `${form.firstName || ''} ${form.lastName || ''}`.trim() || undefined;
  }
  if (form.email !== initial.email) payload.email = form.email;
  if (form.phone !== initial.phone) payload.phone = form.phone;
  if (form.recruiterId !== initial.recruiterId) payload.recruited_by = form.recruiterId;
  if (form.leaderId !== initial.leaderId) payload.leader = form.leaderId;
  return payload;
}

export function buildProfileSummary(row: Prospect): string {
  const profile = row.profile;
  if (!profile) return '-';

  const flags = profile.flags || {};
  const parts = [
    profile.how_known || null,
    profile.relationship !== undefined && profile.relationship !== null ? `${profile.relationship}/10` : null,
    profile.occupation || null,
    typeof flags.language === 'string' ? flags.language : null,
    flags.married ? 'Married' : null,
    flags.dependentKids ? 'Dependent Kids' : null,
  ];

  return parts.filter(Boolean).join(' | ') || '-';
}
