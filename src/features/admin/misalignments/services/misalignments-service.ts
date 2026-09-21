/**
 * API client for the read-only Data Integrity reports. Talks to the Django
 * `misalignments` app, which runs SELECT-only diagnostics and returns JSON.
 */

import type {
  LeaderMisalignmentsResponse,
  MisalignmentsAccess,
  PolicyDetailResponse,
  PolicyMisalignmentsResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Misalignments request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Capability flag used to gate the menu group and route guard. */
export function fetchMisalignmentsAccess(): Promise<MisalignmentsAccess> {
  return getJson('/api/misalignments/my-access/');
}

export function fetchLeaderMisalignments(): Promise<LeaderMisalignmentsResponse> {
  return getJson('/api/misalignments/leaders/');
}

export function fetchPolicyMisalignments(): Promise<PolicyMisalignmentsResponse> {
  return getJson('/api/misalignments/policies/');
}

export function fetchPolicyDetail(policyId: number): Promise<PolicyDetailResponse> {
  return getJson(`/api/misalignments/policies/${policyId}/`);
}
