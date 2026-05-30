import { queryClient } from '@/infrastructure/query';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TEAM_SEGMENT_SUMMARY_QUERY_KEY = 'team-segment-summary';

export interface TeamSegmentSummaryResponse {
  accessible_segments?: string[];
  segments?: Array<{
    segment?: string;
    visible?: boolean;
  }>;
}

function getRolesSignature(): string {
  const rawRoles = localStorage.getItem('wb.roles');
  if (!rawRoles) return '';

  try {
    const roles = JSON.parse(rawRoles) as unknown;
    if (!Array.isArray(roles)) return rawRoles;
    return roles
      .filter((role): role is string => typeof role === 'string')
      .map((role) => role.trim())
      .sort()
      .join(',');
  } catch {
    return rawRoles;
  }
}

function getQueryKey(): readonly [string, string, string] {
  return [
    TEAM_SEGMENT_SUMMARY_QUERY_KEY,
    localStorage.getItem('wb.userId') || '',
    getRolesSignature(),
  ];
}

export async function invalidateTeamSegmentSummary(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [TEAM_SEGMENT_SUMMARY_QUERY_KEY] });
}

export function fetchTeamSegmentSummary(): Promise<TeamSegmentSummaryResponse> {
  return queryClient.fetchQuery({
    queryKey: getQueryKey(),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const token = localStorage.getItem('wb.authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/accounts/users/segments/`, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch segments: ${response.statusText}`);
      }

      return response.json() as Promise<TeamSegmentSummaryResponse>;
    },
  });
}
