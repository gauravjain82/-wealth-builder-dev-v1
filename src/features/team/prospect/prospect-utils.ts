import type { Prospect } from './services/prospect-service';

export function buildProfileSummary(row: Prospect): string {
  const profile = row.profile;
  if (!profile) return '-';

  const flags = profile.flags || {};
  const parts = [
    profile.how_known || null,
    profile.relationship !== undefined && profile.relationship !== null ? `${profile.relationship}/10` : null,
    profile.occupation || null,
    flags.married ? 'Married' : null,
    flags.dependentKids ? 'Dependent Kids' : null,
  ];

  return parts.filter(Boolean).join(' | ') || '-';
}
