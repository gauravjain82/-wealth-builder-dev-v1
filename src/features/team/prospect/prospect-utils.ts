import type { Prospect } from './services/prospect-service';

export function getAgeFromBirthday(birthday?: string | null): string {
  if (!birthday) return '-';
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return '-';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? String(age) : '-';
}

export function buildProfileSummary(row: Prospect): string {
  const profile = row.profile;
  if (!profile) return '-';

  const age = getAgeFromBirthday(profile.birthday);
  const flags = profile.flags || {};
  const parts = [
    profile.how_known || null,
    profile.relationship !== undefined && profile.relationship !== null ? `${profile.relationship}/10` : null,
    profile.occupation || null,
    flags.married ? 'Married' : null,
    flags.dependentKids ? 'Dependent Kids' : null,
    age !== '-' ? `Age: ${age}` : null,
  ];

  return parts.filter(Boolean).join(' | ') || '-';
}
