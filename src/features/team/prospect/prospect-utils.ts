import type { Prospect } from '../services/prospect-service';

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
  const parts = [
    profile.occupation || '-',
    profile.gender || '-',
    age,
    profile.city || '-',
    profile.state || '-',
  ];

  return parts.join(' | ');
}
