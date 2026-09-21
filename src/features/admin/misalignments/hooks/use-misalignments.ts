/** React Query hooks for the read-only Data Integrity reports. */

import { useQuery } from '@tanstack/react-query';

import {
  fetchLeaderMisalignments,
  fetchMisalignmentsAccess,
  fetchPolicyDetail,
  fetchPolicyMisalignments,
} from '../services/misalignments-service';

/** Whether the current user may view the Data Integrity reports. */
export function useMisalignmentsAccess() {
  return useQuery({
    queryKey: ['misalignments', 'my-access'],
    queryFn: fetchMisalignmentsAccess,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaderMisalignments() {
  return useQuery({
    queryKey: ['misalignments', 'leaders'],
    queryFn: fetchLeaderMisalignments,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePolicyMisalignments() {
  return useQuery({
    queryKey: ['misalignments', 'policies'],
    queryFn: fetchPolicyMisalignments,
    staleTime: 10 * 60 * 1000,
  });
}

/** Loads a single policy's linked records; enabled only when a policy is open. */
export function usePolicyDetail(policyId: number | null) {
  return useQuery({
    queryKey: ['misalignments', 'policy-detail', policyId],
    queryFn: () => fetchPolicyDetail(policyId as number),
    enabled: policyId != null,
  });
}
