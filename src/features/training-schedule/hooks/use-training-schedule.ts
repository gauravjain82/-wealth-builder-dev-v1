/**
 * React Query hooks for the training schedule.
 *
 * Query keys carry the full selection (the week and the admin scope, the host,
 * the delete target) and every `queryFn` forwards React Query's `signal`, so
 * paging quickly through weeks cancels the superseded request and ignores its
 * answer. Every write invalidates the module root except access and settings,
 * which no schedule write can change.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '../services/training-schedule-service';
import type { ScheduleSettingsPatch, TrainingInput, TrainingPatch, TrainingTarget } from '../types';

const ROOT = 'training-schedule';
const ACCESS = 'training-schedule-access';

export const scheduleKeys = {
  access: [ACCESS] as const,
  occurrences: (range: { start: string; end: string; everything: boolean }) =>
    [ROOT, 'occurrences', range] as const,
  deletePreview: (target: TrainingTarget) =>
    [ROOT, 'delete-preview', target.trainingId, target.occurrenceId ?? null] as const,
  hosts: (query: string) => [ROOT, 'hosts', query] as const,
  hostTrainings: (hostId: number | null) => [ROOT, 'host-trainings', hostId] as const,
  attendance: (occurrenceId: number | null) => [ROOT, 'attendance', occurrenceId] as const,
  settings: [ACCESS, 'settings'] as const,
};

/** How often the open attendance list refreshes. */
export const ATTENDANCE_POLL_MS = 5000;

/** What the caller may do; decides which controls render (never 403s). */
export function useTrainingScheduleAccess() {
  return useQuery({
    queryKey: scheduleKeys.access,
    queryFn: ({ signal }) => api.fetchMyAccess(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOccurrences(range: { start: string; end: string; everything: boolean }) {
  return useQuery({
    queryKey: scheduleKeys.occurrences(range),
    queryFn: ({ signal }) => api.fetchOccurrences(range, signal),
    staleTime: 60 * 1000,
  });
}

function useInvalidateSchedule() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [ROOT] });
}

export function useCreateTraining() {
  const invalidate = useInvalidateSchedule();
  return useMutation({ mutationFn: (input: TrainingInput) => api.createTraining(input), onSuccess: invalidate });
}

export function useUpdateTraining() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({ trainingId, patch }: { trainingId: number; patch: TrainingPatch }) =>
      api.updateTraining(trainingId, patch),
    onSuccess: invalidate,
  });
}

/** What a delete would remove; never cached, so the dialog always shows the current picture. */
export function useDeletePreview(target: TrainingTarget | null) {
  return useQuery({
    queryKey: scheduleKeys.deletePreview(target ?? { trainingId: 0 }),
    queryFn: ({ signal }) => api.fetchDeletePreview(target as TrainingTarget, signal),
    enabled: target !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useDeleteTraining() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({ target, expectedCount }: { target: TrainingTarget; expectedCount: number }) =>
      api.deleteTraining(target, expectedCount),
    // A stale confirmation (409) means the schedule moved; refresh either way.
    onSettled: invalidate,
  });
}

export function useInheritTraining() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({ target, inherit }: { target: TrainingTarget; inherit: boolean }) =>
      inherit ? api.inheritTraining(target) : api.uninheritTraining(target),
    onSuccess: invalidate,
  });
}

/** Hosts to inherit from: the upline when `query` is short, a company-wide search otherwise. */
export function useHosts(query: string, enabled: boolean) {
  const q = query.trim().length >= 2 ? query.trim() : '';
  return useQuery({
    queryKey: scheduleKeys.hosts(q),
    queryFn: ({ signal }) => api.fetchHosts(q, signal),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useHostTrainings(hostId: number | null) {
  return useQuery({
    queryKey: scheduleKeys.hostTrainings(hostId),
    queryFn: ({ signal }) => api.fetchHostTrainings(hostId as number, signal),
    enabled: hostId !== null,
  });
}

/** The attendance list for one date; polls while open and the browser tab is visible. */
export function useAttendance(occurrenceId: number | null) {
  return useQuery({
    queryKey: scheduleKeys.attendance(occurrenceId),
    queryFn: ({ signal }) => api.fetchAttendance(occurrenceId as number, signal),
    enabled: occurrenceId !== null,
    refetchInterval: ATTENDANCE_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

/** Record the signed-in user at the training behind an attendance link. */
export function useAttend() {
  const invalidate = useInvalidateSchedule();
  return useMutation({ mutationFn: (token: string) => api.attend(token), onSuccess: invalidate, retry: false });
}

export function useScheduleSettings(enabled: boolean) {
  return useQuery({
    queryKey: scheduleKeys.settings,
    queryFn: ({ signal }) => api.fetchSettings(signal),
    enabled,
  });
}

export function useSaveScheduleSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ScheduleSettingsPatch) => api.saveSettings(patch),
    onSuccess: (settings) => {
      client.setQueryData(scheduleKeys.settings, settings);
      // The hosting level and delete rules feed access and every preview.
      client.invalidateQueries({ queryKey: scheduleKeys.access });
      client.invalidateQueries({ queryKey: [ROOT] });
    },
  });
}
